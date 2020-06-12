
class ElasticCounter {
    constructor() {
        this.clear()
    }

    clear() {
        this.counters = {}
    }

    toString() {
        let str = ''
        for (const k in this.counters) {
            const counter = this.counters[k]
            str += `${k}: ${counter.limit / counter.upper * 100}%\n`
        }
        return str
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
            upper: bounds && bounds.upper ? bounds.upper : 100,
            lower: bounds && bounds.lower ? bounds.lower : 10,
            reward: bounds && bounds.reward ? bounds.reward : 0.1,
            penalty: bounds && bounds.penalty ? bounds.penalty : -0.2,
            count: 0,
        }

        if (counter.lower > counter.upper) {
            counter.lover = counter.upper
        }

        counter.limit = counter.upper

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

        return counter.count > (counter.limit | 0)
    }

    reward(key, magnitude=1) {
        const counter = this.start(key)

        counter.limit += counter.reward * magnitude

        if (counter.limit > counter.upper) {
            counter.limit = counter.upper
        }
 
        return counter.limit
    }

    penalize(key, magnitude=1) {
        const counter = this.start(key)

        counter.limit += counter.penalty * magnitude
 
        if (counter.limit < counter.lower) {
            counter.limit = counter.lower
        }
 
        return counter.limit
    }
}

module.exports = ElasticCounter
