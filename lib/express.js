const express = require("express");
const msecond = require('./times').msecond
const counters = require('../').global()
const app = express();
const port = 7777

function elastic(key, options) {
    let keyValue = key
    let keySelector = null

    if (typeof key === 'function') {
        keyValue = null
        keySelector = key
    }

    return (req, res, next) => {
        const counterKey = keyValue || keySelector(req, res)
        const counter = counters.start(counterKey, options).tick()

        if (counter.isBroken()) {
            res.status(503).end()
        }

        else if (counter.isOver()) {
            res.status(429).end()
        }

        else {
            const start = process.hrtime();
            res.once("finish", () => {
                const elapsed = msecond(start)

                let penalized = false
                if (options.avoidLatency && options.avoidLatency < elapsed) {
                    penalized = counter.penalize()
                }

                if (options.avoidErrors && res.statusCode >= 500) {
                    penalized = counter.penalize().break()
                }

                if (!penalized) {
                    counter.reward()
                }
            });

            if (options.avoidDisconnects) {
                res.once("close", () => {
                    counter.penalize()
                });
            }

            next && next()
        }
    }
}

app.get("/", elastic(r => r.url, {
    upper: 1,
    lower: 1,
    breaksAfter: 1,
    breakDuration: 10 * 1000,
    avoidLatency: 100,
    avoidErrors: true,
    avoidDisconnects: true,
}), (req, res) => {
    setTimeout(() => res.status(200).end(), 100)
});

app.get("/c", (req, res) => {
    res.end(counters.toString())
});

app.listen(port);
console.log(`HTTP server is running at ${port}`)
