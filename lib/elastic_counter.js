const second = require('./times').second

class ElasticCounter {
    constructor(bounds) {
        this.upper = bounds && bounds.upper ? bounds.upper : 100
        this.lower = bounds && bounds.lower ? bounds.lower : 10
        this.reward = bounds && bounds.reward ? bounds.reward : 0.1
        this.penalty = bounds && bounds.penalty ? bounds.penalty : -0.2
        this.breaksAfter = bounds && bounds.breaksAfter ? bounds.breaksAfter : 0
        this.breakDuration = bounds && bounds.breakDuration ? bounds.breakDuration : 0
        this.limit = this.upper
        this.recoversAfter = 0
        this.slice = second()
        this.reset()
    }

    reset() {
        this.count = 0
        this.breaksCount = 0

        return this
    }

    tick(slice) {
        slice = slice || second()

        if (this.slice < slice) {
            this.slice = slice
            this.reset()
        }

        if (this.recoversAfter < slice) {
            this.recoversAfter = 0
        }

        this.count++

        return this
    }

    reward(magnitude = 1) {
        this.limit += this.reward * magnitude

        if (this.limit > this.upper) {
            this.limit = this.upper
        }

        return this
    }

    penalize(magnitude = 1) {
        this.limit += this.penalty * magnitude

        if (this.limit < this.lower) {
            this.limit = this.lower
        }

        return this
    }

    break() {
        this.breaksCount++

        if (this.breaksCount === this.breaksAfter) {
            this.recoversAfter = this.slice + this.breakDuration / 1000
        }

        return this
    }

    isBroken() {
        return (this.recoversAfter !== 0)
    }

    isOver() {
        return (this.count > this.limit)
    }
}

module.exports = ElasticCounter
