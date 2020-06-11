
class ElasticCounter {

    static current() {
        return this.instance || (this.instance = new ElasticCounter())
    }

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
            counter.upper = bounds.upper || 100
            counter.lower = bounds.lower || 10
            counter.scale = bounds.scale || 1000
            counter.reward = bounds.reward || 1 * counter.scale
            counter.penalty = bounds.penalty || -2 * counter.scale
            counter.points = bounds.upper * counter.scale
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

        const limit = counter.upper * counter.points / (counter.upper * counter.scale) | 0

        return (counter.count > limit)
    }

    reward(key, points) {
        const counter = this.start(key)
        counter.points += points || counter.reward

        if (counter.points > counter.upper * counter.scale) {
            counter.points = counter.upper * counter.scale
        }
 
        return counter.points
    }

    penalize(key, points) {
        const counter = this.start(key)
        counter.points += points || counter.penalty
 
        if (counter.points < counter.lower * counter.scale) {
            counter.points = counter.lower * counter.scale
        }
 
        return counter.points
    }
}

module.exports = ElasticCounter
