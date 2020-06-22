const analyze = require('./middleware').analyze
const counters = require('../').global()

function elastic(key, options) {
    const keyValue = typeof key === 'function' ? null : key
    return (ctx, next) => {
        const counterKey = keyValue || key(ctx)
        const counter = counters.start(counterKey, options).tick()
        if (counter.isOpen()) {
            ctx.response.status = 503
        } else if (counter.isOver()) {
            ctx.response.status = 429
        } else {
            analyze(counter, options, ctx)
            return next()
        }
    }
}

// example

const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const port = 7777

router.get("/", elastic(
    ctx => ctx.req.url, {
    upper: 10,
    lower: 1,
    breaksAfter: 1,
    breakDuration: 10 * 1000,
    avoidLatency: 100,
    avoidErrors: true,
    avoidDisconnects: true,
}), async (ctx, next) => {
    await new Promise(resolve => {
        setTimeout(() => {
            ctx.response.status = 200
            ctx.body = 'OK'
            resolve()
        }, 100)
    })
});

router.get("/c", (ctx, next) => {
    ctx.body = counters.toString()
});

app.use(router.routes())

app.listen(port);
console.log(`HTTP server is running at ${port}`)
