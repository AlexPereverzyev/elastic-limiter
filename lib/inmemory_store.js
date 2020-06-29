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
}

module.exports = InMemoryStore
