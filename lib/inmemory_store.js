"use strict"

const ElasticCounter = require('./elastic_counter')

class InMemoryStore {
    constructor() {
        this.clear()
    }

    start(key, bounds=null) {
        if (key in this.counters) {
            return this.counters[key]
        }

        const counter = new ElasticCounter(bounds)

        this.counters[key] = counter

        return counter
    }

    get(key) {
        return this.counters[key]
    }

    clear(key) {
        if (key) {
            delete this.counters[key]    
        } else {
            this.counters = {}
        }
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

module.exports = InMemoryStore
