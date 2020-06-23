"use strict"

const axios = require('axios')
const counters = require('../').global()
const msecond = require('./seconds').msecond

function elastic(axiosInstance, key, options) {
    const keyValue = typeof key === 'function' ? null : key
    axiosInstance.interceptors.request.use(
        function (config) {
            const counterKey = keyValue || key(config)
            const counter = counters.start(counterKey, options).tick()

            if (counter.isOpen()) {
                throw new axios.Cancel('Circuit is open');
            } else if (counter.isOver()) {
                throw new axios.Cancel('Rate limit exceeded');
            }

            config._counter_key = counterKey
            config._counter_start = options.avoidLatency ? process.hrtime() : null

            return config;
        }, function (err) {
            if (options.avoidDisconnects &&
                err.config && err.config._counter_key) {
                const counter = counters.get(err.config._counter_key)
                if (counter) {
                    counter.penalize()
                }
            }
            return Promise.reject(err)
        }
    )
    axiosInstance.interceptors.response.use(
        function (res) {
            const counter = counters.get(res.config._counter_key)
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
            if (options.avoidErrors &&
                err.config && err.config._counter_key) {
                const counter = counters.get(err.config._counter_key)
                if (counter) {
                    counter.penalize().break()
                }
            }
            return Promise.reject(err)
        }
    )
    return axiosInstance
}

// example

(async function () {

    const elasticAxios = elastic(axios, ctx => ctx.url, {
        upper: 10,
        lower: 1,
        breaksAfter: 1,
        breakDuration: 10 * 1000,
        avoidLatency: 100,
        avoidErrors: true,
        avoidDisconnects: true,
    })
    let ec = 0
    for (let i = 0; i < 100; i++)
        try {
            await elasticAxios.get('http://localhost:9999/?l=1&lr=1')
        } catch {
            ec++
        }

    console.info('counters:\n', counters.toString())
    console.info('errors:\n', ec.toString())

})()
