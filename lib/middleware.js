"use strict"

const { second, msecond } = require('./seconds')
const counters = require('./counters_store').useStore

module.exports.koa = function (key, options) {
    const keyValue = typeof key === 'function' ? null : key
    return (ctx, next) => {
        const now = second()
        const counterKey = keyValue || key(ctx)
        const counter = counters().start(counterKey, options).tick(now)
        if (options.verbose) {
            ctx.set({
                'X-RateLimit-Limit': counter.upper,
                'X-RateLimit-Remaining': counter.upper > counter.count ? counter.upper - counter.count : 0,
                'X-RateLimit-Reset': counter.slice - now + 1
            })
        }
        if (counter.isOpen()) {
            if (options.verbose) {
                ctx.set('Retry-After', counter.recoversAfter - now + 1)
            }
            ctx.response.status = 503
            ctx.body = 'Circuit is open'
        } else if (counter.isOver()) {
            if (options.verbose) {
                ctx.set('Retry-After', counter.slice - now + 1)
            }
            ctx.response.status = 429
            ctx.body = 'Rate limit exceeded'
        } else {
            adapt(counter, options, ctx)
            return next()
        }
    }
}

module.exports.express = function (key, options) {
    const keyValue = typeof key === 'function' ? null : key
    return (req, res, next) => {
        const ctx = { req, res }
        const now = second()
        const counterKey = keyValue || key(ctx)
        const counter = counters().start(counterKey, options).tick(now)
        if (options.verbose) {
            res.set('X-RateLimit-Limit', counter.upper)
            res.set('X-RateLimit-Remaining', counter.upper > counter.count ? counter.upper - counter.count : 0)
            res.set('X-RateLimit-Reset', counter.slice - now + 1)
        }
        if (counter.isOpen()) {
            if (options.verbose) {
                res.set('Retry-After', counter.recoversAfter - now + 1)
            }
            res.status(503).end('Circuit is open')
        } else if (counter.isOver()) {
            if (options.verbose) {
                res.set('Retry-After', counter.slice - now + 1)
            }
            res.status(429).end('Rate limit exceeded')
        } else {
            adapt(counter, options, ctx)
            next && next()
        }
    }
}

function adapt(counter, options, ctx) {
    if (options.avoidLatency || options.avoidErrors) {
        const start = process.hrtime()
        ctx.res.once("finish", () => {
            const elapsed = msecond(start)
            let penalized = false
            if (options.avoidLatency && options.avoidLatency < elapsed) {
                penalized = counter.penalize().unbreak()
            }
            if (options.avoidErrors && ctx.res.statusCode >= 500) {
                penalized = counter.penalize().break()
            }
            if (!penalized) {
                counter.reward()
            }
        });
    }

    if (options.avoidDisconnects) {
        ctx.res.once("close", () => {
            counter.penalize()
        });
    }
}

module.exports.axios = function (axiosInstance, key, options) {
    const keyValue = typeof key === 'function' ? null : key
    axiosInstance.interceptors.request.use(
        function (config) {
            const now = second()
            const counterKey = keyValue || key(config)
            const counter = counters().start(counterKey, options).tick(now)
            if (counter.isOpen()) {
                throw errorFor(counter, now, 'Circuit is open')
            } else if (counter.isOver()) {
                throw errorFor(counter, now, 'Rate limit exceeded')
            }
            config._counter_key = counterKey
            config._counter_start = options.avoidLatency ? process.hrtime() : null
            return config;
        }, function (err) {
            if (options.avoidDisconnects && err.config && err.config._counter_key) {
                const counter = counters().get(err.config._counter_key)
                if (counter) {
                    counter.penalize()
                }
            }
            return Promise.reject(err)
        }
    )
    axiosInstance.interceptors.response.use(
        function (res) {
            const counter = counters().get(res.config._counter_key)
            if (counter) {
                const elapsed = res.config._counter_start ? msecond(res.config._counter_start) : 0
                let penalized = false
                if (options.avoidLatency && options.avoidLatency < elapsed) {
                    penalized = counter.penalize().unbreak()
                }
                if (options.avoidErrors && res.status >= 500) {
                    penalized = counter.penalize().break()
                }
                if (!penalized) {
                    counter.reward()
                }
            }
            return res;
        }, function (err) {
            if (options.avoidErrors && err.config && err.config._counter_key) {
                const counter = counters().get(err.config._counter_key)
                if (counter) {
                    counter.penalize().break()
                }
            }
            return Promise.reject(err)
        }
    )
    return axiosInstance
}

function errorFor(counter, now, message) {
    const err = new Error(message)
    err.retryAfter = (counter.isOpen() ? counter.recoversAfter : counter.slice) - now + 1
    return err
}
