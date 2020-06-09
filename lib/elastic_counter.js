
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
            ...DefaultBounds,
            ...bounds,
            slice: slice || this.second(),
            count: 0,
        }

        this.counters[key] = counter

        return counter
    }

    over(key, limit, slice=this.second()) {
        const counter = this.start(key, { limit }, slice)

        if (counter.slice < slice) {
            counter.slice = slice
            counter.count = 0
        }

        counter.count++

        return (counter.count > this.limit(key))
    }

    reward(key) {
        const counter = this.start(key)
        counter.points += counter.rewardPoints

        if (counter.points > counter.maxPoints) {
            counter.points = counter.maxPoints
        }
 
        return counter.points
    }

    penalize(key) {
        const counter = this.start(key)
        counter.points += counter.penaltyPoints
 
        if (counter.points < counter.minPoints) {
            counter.points = counter.minPoints
        }
 
        return counter.points
    }

    limit(key) {
        const counter = this.start(key)
        return counter.limit * (counter.points / counter.maxPoints) | 0
    }
}

const DefaultBounds = {
    minPoints: 1,
    maxPoints: 1000, // 0.1% resolution
    rewardPoints: 1,
    penaltyPoints: -2,
    points: 1000,
    limit: 100,
}

module.exports = ElasticCounter
