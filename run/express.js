"use strict"

const elastic = require('../').express
const express = require("express");
const app = express();
const port = 7777

app.get("/", elastic(
    ctx => ctx.req.url, {
    upper: 10,
    lower: 1,
    interval: '00:00:01',
    breaksAfter: 1,
    breakDuration: 10,
    avoidLatency: 100,
    avoidErrors: true,
    avoidDisconnects: true,
    verbose: true
}), (req, res) => {
    setTimeout(() => {
        res.status(200).end('OK\n')
    }, 100)
});

const server = app.listen(port);
console.log(`HTTP server is running at ${port}`)
