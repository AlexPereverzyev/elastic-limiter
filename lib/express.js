const express = require("express");
const app = express();
const port = 7777

const deltaMsec = (start) => {
    const delta = process.hrtime(start)
    return delta[0] * 1e3 + delta[1] / 1e6
}

function mw(req, res, next) {
    const startTime = process.hrtime();

    const measure = () => {
        const elapsed = deltaMsec(startTime)
        console.log("%s - %s : %fms", res.statusCode, req.path, elapsed);
    }

    res.once("close", measure);
    res.once("finish", measure);

    next()
}

app.get("/", mw, (req, res) => {
    setTimeout(() => res.end("hello"), 100)
});

app.listen(port);
console.log(`HTTP server is running at ${port}`)
