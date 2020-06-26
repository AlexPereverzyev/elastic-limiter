"use strict"

module.exports.second = function() {
    return new Date() / 1000 | 0
}

module.exports.msecond = function(start) {
    const delta = process.hrtime(start)
    return delta[0] * 1e3 + delta[1] / 1e6
}

module.exports.interval = function(time) {
    return new Date(`1970-01-01T${time}Z`) / 1000 | 0
}
