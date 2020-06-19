const axios = require('axios')
const msecond = require('./seconds').msecond
const counters = require('../').global()

function elastic(axiosInstance, key, options) {
    axiosInstance.interceptors.request.use(
        function (config) {
            console.info('Request:\n', config.method, config.url)

            const keyValue = typeof key === 'function' ? null : key
            const counterKey = keyValue || key(config)
            const counter = counters.start(counterKey, options).tick()
            if (counter.isBroken()) {
                throw new axios.Cancel('IsBroken');
            } else if (counter.isOver()) {
                throw new axios.Cancel('IsOver');
            }
            config._counter_key = counterKey
            config._counter_start = options.avoidLatency ? process.hrtime() : null 
            return config;
        }, function (err) {
            const counter = err.config && err.config._counter_key ? counters.get(err.config._counter_key) : null
            if (counter && options.avoidDisconnects) {
                counter.penalize()
            }
            return Promise.reject(err)
        }
    )
    axiosInstance.interceptors.response.use(
        function (res) {
            console.info('Response:\n', res.status, res.data)

            const counter = counters.get(res.config._counter_key)
            if (counter) {
                const elapsed = res.config._counter_start ? msecond(res.config._counter_start) : 0

                let penalized = false
                if (options.avoidLatency && options.avoidLatency < elapsed) {
                    penalized = counter.penalize()
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
            const counter = err.config && err.config._counter_key ? counters.get(err.config._counter_key) : null
            if (counter && options.avoidErrors && err.response && err.response.status >= 500) {
                counter.penalize().break()
            }
            return Promise.reject(err)
        }
    )
}

// example

(async function () {
    elastic(axios, ctx => ctx.url, {
        upper: 10,
        lower: 1,
        breaksAfter: 1,
        breakDuration: 10 * 1000,
        avoidLatency: 100,
        avoidErrors: true,
        avoidDisconnects: true,
    })

    try {
        await axios.get('http://localhost:9999/?l=200&s=200&bs=8')
    } catch(err) {
        console.error('Error:\n', err.message)
    }

    console.info('Counters:\n', counters.toString())
})()
