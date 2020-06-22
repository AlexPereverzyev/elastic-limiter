const analyze = require('./middleware').analyze
const counters = require('../').global()

function elastic(key, options) {
    const keyValue = typeof key === 'function' ? null : key
    return (req, res, next) => {
        const ctx = { req, res }
        const counterKey = keyValue || key(ctx)
        const counter = counters.start(counterKey, options).tick()
        if (counter.isOpen()) {
            res.status(503).end()
        } else if (counter.isOver()) {
            res.status(429).end()
        } else {
            analyze(counter, options, ctx)
            next && next()
        }
    }
}

// example

const express = require("express");
const app = express();
const port = 7777

app.get("/", elastic(
    ctx => ctx.req.url, {
    upper: 10,
    lower: 1,
    breaksAfter: 1,
    breakDuration: 10 * 1000,
    avoidLatency: 100,
    avoidErrors: true,
    avoidDisconnects: true,
}), (req, res) => {
    setTimeout(() => {
        res.status(200).end('OK')
    }, 100)
});

app.get("/c", (req, res) => {
    res.end(counters.toString())
});

app.listen(port);
console.log(`HTTP server is running at ${port}`)
