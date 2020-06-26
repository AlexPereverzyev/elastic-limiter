
### UNDER CONSTRUCTION

# elastic-limiter

[![npm](https://img.shields.io/npm/v/elastic-limiter.svg?style=flat-square)](https://www.npmjs.org/package/elastic-limiter)
[![Coverage Status](https://coveralls.io/repos/github/AlexPereverzyev/fanout/badge.svg?branch=master)](https://coveralls.io/github/AlexPereverzyev/elastic-limiter?branch=master)

Elastic-limiter is an adaptive rate limiter and circuit breaker middleware for Koa, Express and Axios in one package!

Elastic-limiter setups hooks on request and response to track latency and errors and ajust QPS limit depending on how Koa/Express request handler performs or, in case of Axios, how remote endpoint responds. Such adaptive behavior greatly increases stability of your software and servers. 


## Installation

```
npm install elastic-limiter
```

## Usage

### Koa

To setup adaptive rate limiter (10 QPS) middleware on a single route:

```
const elastic = require('elastic-limiter').koa
const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const port = 7777

router.get("/", elastic(
    ctx => ctx.req.url, { // use request URL as counter key
    upper: 10,
    lower: 1,
    interval: '00:00:01',
    breaksAfter: 1,
    breakDuration: 10,
    avoidLatency: 100,
    avoidErrors: true,
    avoidDisconnects: true,
    verbose: true
}), async (ctx, next) => {
    await new Promise(resolve => {
        setTimeout(() => {
            ctx.response.status = 200
            ctx.body = 'OK\n'
            resolve()
        }, 100)
    })
});

app.use(router.routes())

const server = app.listen(port);
```

### Express

```
const elastic = require('elastic-limiter').express
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
```

### Axios

```
const elastic = require('elastic-limiter').axios
const axios = require('axios');

(async function () {

    const elasticAxios = elastic(axios,
        ctx => ctx.url, {
        upper: 10,
        lower: 1,
        interval: '00:01:00',
        breaksAfter: 1,
        breakDuration: '00:01:00',
        avoidLatency: 100,
        avoidErrors: true,
        avoidDisconnects: true
    })

    for (let i = 0; i < 10; i++) {
        try {
            await elasticAxios.get('http://example.com')
        } catch (err) {
            console.error(err)
        }
    }
})()
```

## Options

- key - counter key selector, can be constant or function with context parameter
- upper/limit - sets the upper QPS limit (normally it's max allowed QPS)
- lower - sets the lower QPS limit
- interval - time string or number of seconds defining time frame to which the limits are applied, default 1 sec 
- breaksAfter - sets the number of failures to open the circuit and respond with 503 for _breakDuration_ sec
- breakDuration - time string or number of seconds to wait before close opened circuit, default 1 sec
- avoidLatency - reduce rate limit when response takes longer than specified, not set by default
- avoidErrors - reduce rate limit when response status code means server error (500 or more), default false
- avoidDisconnects - reduce rate limit when client drops connection (timeout, etc), default false
- verbose - to send rate limit headers or not, default false

Note, in case of Axios middleware, the corresponding exception will be thrown instead on 429 or 503 response status core.


## Extensibility

To replace counters storage (for example, with Redis backend) all is needed is to pass storage instance to _useStore_ call:

```
const { useStore, CountersStore } = require('elastic-limiter')

class MyCustomStore extends CountersStore {
    constructor() {
        super()
    }

    get() {
        // todo: implement
    }

    set() {
        // todo: implement
    }
}

useStore(new MyCustomStore())
```

Note, by default, in memory store is used.
