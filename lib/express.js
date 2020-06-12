const express = require("express");
const app = express();
const port = 7777
const counter = require('../').global()

function deltaMsec(start) {
    const delta = process.hrtime(start)
    return delta[0] * 1e3 + delta[1] / 1e6
}

function elastic(req, res, next) {
    const startTime = process.hrtime();
    const measure = (magnitude) => {
        const elapsed = deltaMsec(startTime)

        if (elapsed > 100) {
            counter.penalize(req.url, magnitude)
        } else {
            counter.reward(req.url)
        }

        if (res.statusCode >= 500) {
            counter.penalize(req.url, 10 * magnitude)
        } else {
            counter.reward(req.url)
        }

        console.log(`${res.statusCode} - ${req.path}: ${elapsed})`);
    }

    res.once("close", () => measure(2));
    res.once("finish", () => measure(1));

    next()
}

app.get("/c", (req, res) => {
    res.end(counter.toString())
});

app.get("/", elastic, (req, res) => {
    setTimeout(() => res.writeHead(500).end(), 100)
});

app.listen(port);
console.log(`HTTP server is running at ${port}`)
