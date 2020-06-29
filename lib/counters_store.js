
const ElasticCounter = require('./elastic_counter')

class CountersStore {

    start(key, bounds = null) {
        let counter = this.get(key)

        if (!counter) {
            counter = new ElasticCounter(bounds)
            this.set(key, counter)
        }

        return counter
    }

    get(key) {
        throw new TypeError("Not implemented")
    }

    set(key, counter) {
        throw new TypeError("Not implemented")
    }
}

let currentInstance = null

module.exports = {
    useStore: function (instance) {
        if (instance) {
            currentInstance = instance
        }
        return currentInstance
    },
    CountersStore
}
