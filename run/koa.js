"use strict"

const elastic = require('../').koa
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
console.log(`HTTP server is running at ${port}`)
