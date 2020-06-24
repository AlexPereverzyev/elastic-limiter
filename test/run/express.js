"use strict"

const elastic = require('../..').express
const express = require("express");
const app = express();
const port = 7777

app.get("/", elastic(
    ctx => ctx.req.url, {
    upper: 10,
    lower: 1,
    breaksAfter: 1,
    breakDuration: 10,
    avoidLatency: 100,
    avoidErrors: true,
    avoidDisconnects: true,
    setHeaders: true
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
