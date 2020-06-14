
module.exports.second = function() {
    return new Date() / 1000 | 0
}

module.exports.msecond = function(start) {
    const delta = process.hrtime(start)
    return delta[0] * 1e3 + delta[1] / 1e6
}
