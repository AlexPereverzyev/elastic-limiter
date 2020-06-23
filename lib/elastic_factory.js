"use strict"

const ElasticCounter = require('./elastic_counter')

class ElasticFactory {
    constructor() {
        this.clear()
    }

    clear() {
        this.counters = {}
    }

    get(key) {
        return this.counters[key]
    }

    start(key, bounds=null) {
        if (key in this.counters) {
            return this.counters[key]
        }

        const counter = new ElasticCounter(bounds)

        this.counters[key] = counter

        return counter
    }

    toString() {
        let str = ''
        for (const k in this.counters) {
            const counter = this.counters[k]
            const throttle = counter.upper
                ? (counter.limit / counter.upper * 100).toFixed(4)
                : '100'
            const open = counter.breaksAfter
                ? (counter.breaksCount / counter.breaksAfter * 100).toFixed(4)
                : '0'
            str += `${k} - T: ${throttle}% O: ${open}%\n`
        }
        return str
    }
}

module.exports = ElasticFactory
