
class ElasticCounter {
    constructor() {
        this.clear()
    }

    clear() {
        this.counters = {}
    }

    second() {
        return new Date() / 1000 | 0
    }

    start(key, bounds, slice) {
        if (key in this.counters) {
            return this.counters[key]
        }

        const counter = {
            slice: slice || this.second(),
            count: 0,
        }

        if (bounds) {
            counter.limit = bounds.upper || 100
            counter.upper = bounds.upper || 100
            counter.lower = bounds.lower || 0
            counter.reward = bounds.reward || 1
            counter.penalty = bounds.penalty || -2
        }

        this.counters[key] = counter

        return counter
    }

    over(key, bounds, slice) {
        if (!slice) {
            slice = this.second()
        }

        const counter = this.start(key, bounds, slice)

        if (counter.slice < slice) {
            counter.slice = slice
            counter.count = 0
        }

        counter.count++

        return (counter.count > counter.limit)
    }

    reward(key) {
        const counter = this.start(key)
        counter.limit += counter.reward

        if (counter.limit > counter.upper) {
            counter.limit = counter.upper
        }
 
        return counter.limit
    }

    penalize(key) {
        const counter = this.start(key)
        counter.limit += counter.penalty
 
        if (counter.limit < counter.lower) {
            counter.limit = counter.lower
        }
 
        return counter.limit
    }
}

module.exports = ElasticCounter
