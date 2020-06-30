# elastic-limiter

[![npm](https://img.shields.io/npm/v/elastic-limiter.svg?style=flat-square)](https://www.npmjs.org/package/elastic-limiter)
[![Coverage Status](https://coveralls.io/repos/github/AlexPereverzyev/elastic-limiter/badge.svg?branch=master)](https://coveralls.io/github/AlexPereverzyev/elastic-limiter?branch=master)

Elastic-limiter is an adaptive rate limiter and circuit breaker middleware for Koa, Express and Axios in one package!

Elastic-limiter setups hooks on request and response to track latency and errors and ajusts rate limit depending on how Koa/Express request handler performs or, in case of Axios, how remote endpoint responds.

Applications of such adaptive behavior can be lowering incoming request rate limit when increase of load results in growing number of slow or errored responses, or when 3rd-party API dependency has an outage and number of timed out sockets results in overall performance degradation. 


## Installation

```
npm install elastic-limiter
```


## Usage

### Koa

Simple rate limiter (10 QPS) middleware on a single route:

```
const elastic = require('elastic-limiter').koa
const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const port = 7777

router.get("/", elastic(
    ctx => ctx.req.url, { // use request URL as counter key
    limit: 10,
    interval: '00:00:01',
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

Adaptive rate limiter (10 to 1 QPS) middleware on a single route:

```
const elastic = require('elastic-limiter').koa
const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const port = 7777

router.get("/", elastic(
    ctx => ctx.req.url, {
    upper: 10,
    lower: 1,
    interval: '00:00:01',
    avoidLatency: 300,
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

Simple rate limiter (10 QPS) with circuit breaker (5 consequtive errored responses) middleware on a single route:

```
const elastic = require('elastic-limiter').koa
const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const port = 7777

router.get("/", elastic(
    ctx => ctx.req.url, {
    limit: 10,
    interval: '00:00:01',
    breaksAfter: 5,
    breakDuration: '00:00:10',
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

Express middleware is very similar to Koa (please see above for details):

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
    breakDuration: '00:00:10',
    avoidLatency: 300,
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

Axios middleware allows to throttle outgoing requests to single or group of remote endpoints:

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
        avoidLatency: 300,
        avoidErrors: true
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


## Configuration

Each middleware function has the following arguments:

- `axiosInstance` - Axios instance, only applicable to Axios middleware, not available for Koa or Express (see examples above)
- `key` - each counter is identified by key, thus the argument is __required__. It can be string or function, in case of later, context with `req` and `res` will be passed as the only argument to the function
- `options` - object representing optional configuration properties:
    - `upper` or `limit` - sets the upper QPS limit (normally it's max allowed QPS), request above the limit will result in response with 429 status, in case of Axios, exception with `retryAfter` property will be thrown instead, default 100
    - `lower` - sets the lower QPS limit, applicable when at least one of `avoidLatency`, `avoidErrors` or `avoidDisconnects` options are enabled, default - `upper` or `limit`
    - `interval` - time string or number of seconds defining time frame to which the limits are applied, default 1 sec 
    - `breaksAfter` - sets the number of failures to open the circuit and respond with 503 for `breakDuration` sec, in case of Axios, exception with `retryAfter` property will be thrown instead. The counter is reset each time successfull response is received
    - `breakDuration` - time string or number of seconds for circuit to remain open, default 1 sec
    - `avoidLatency` - number of milliseconds (fractions allowed), reduce upper rate limit when response takes longer than specified, not set by default (0)
    - `avoidErrors` - reduce upper rate limit when response status code means server error (500 or more), default false
    - `avoidDisconnects` - reduce upper rate limit when client drops connection (timeout, etc), default false, not applicable to Axios middleware
    - `verbose` - to send rate limit headers or not, default false, not applicable to Axios middleware


## Extensibility

To replace counters storage (for example, with Redis backend) all is needed is to pass storage instance to _useStore_ call:

```
const { useStore, CountersStore } = require('elastic-limiter')

class MyCustomStore extends CountersStore {
    constructor() {
        super()
        // todo: initialize
    }

    get(key) {
        // todo: implement
    }

    set(key, counter) { {
        // todo: implement
    }
}

useStore(new MyCustomStore())
```

Note, by default, in memory store is used.
