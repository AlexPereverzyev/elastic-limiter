const msecond = require('./seconds').msecond

module.exports.analyze = function (counter, options, ctx) {
    if (options.avoidLatency || options.avoidErrors) {
        const start = process.hrtime()
        ctx.res.once("finish", () => {
            const elapsed = msecond(start)

            let penalized = false
            if (options.avoidLatency && options.avoidLatency < elapsed) {
                penalized = counter.penalize()
            }

            if (options.avoidErrors && ctx.res.statusCode >= 500) {
                penalized = counter.penalize().break()
            }

            if (!penalized) {
                counter.reward()
            }
        });
    }

    if (options.avoidDisconnects) {
        ctx.res.once("close", () => {
            counter.penalize()
        });
    }
}