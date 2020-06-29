"use strict"

const elastic = require('../..').axios
const axios = require('axios');

(async function () {

    const elasticAxios = elastic(axios, ctx => ctx.url, {
        upper: 10,
        lower: 1,
        interval: '00:01:00',
        breaksAfter: 1,
        breakDuration: '00:01:00',
        avoidLatency: 100,
        avoidErrors: true,
        avoidDisconnects: true,
    })
    let ec = 0
    for (let i = 0; i < 100; i++)
        try {
            await elasticAxios.get('http://localhost:9999/?l=1&lr=1')
        } catch (e) {
            ec++
        }

    console.info('errors:\n', ec.toString())

})()
