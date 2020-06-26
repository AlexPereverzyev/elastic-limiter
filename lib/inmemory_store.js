"use strict"

const { CountersStore } = require('./counters_store')

class InMemoryStore extends CountersStore {
    constructor() {
        super()
        this.counters = {}
    }

    get(key) {
        return this.counters[key]
    }

    set(key, counter) {
        this.counters[key] = counter
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
