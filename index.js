const ElasticCounter = require('./lib/elastic_counter')
const http = require('http')
const port = 7777

const counter = new ElasticCounter()

const server = http.createServer((req, res) => {
    setTimeout(() => {

        if (counter.over(req.url, 1)) {
            res.writeHead(429).end()
        } else {
            res.end()
        }

    }, 100)
})

server.listen(port)

console.info(`HTTP server listening at ${port}`)
