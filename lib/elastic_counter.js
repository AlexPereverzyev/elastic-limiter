"use strict"

const { second, interval } = require('./seconds')

class ElasticCounter {
    constructor(bounds) {
        this.upper = bounds && bounds.limit ? bounds.limit : 100
        this.upper = bounds && bounds.upper ? bounds.upper : bounds.limit
        this.lower = bounds && bounds.lower ? bounds.lower : 10
        this.interval = bounds ? (typeof bounds.interval === 'string' ? interval(bounds.interval) : bounds.interval) || 1 : 1
        this.rewardAmt = bounds && bounds.reward ? bounds.reward : 0.1
        this.penaltyAmt = bounds && bounds.penalty ? bounds.penalty : -0.2
        this.limit = this.upper
        this.breaksAfter = bounds && bounds.breaksAfter ? bounds.breaksAfter : 0
        this.breakDuration = bounds ? (typeof bounds.breakDuration === 'string' ? interval(bounds.breakDuration) : bounds.breakDuration) || 1 : 1
        this.recoversAfter = 0
        this.slice = second() + this.interval - 1
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
            this.slice = slice + this.interval - 1
            this.reset()
        }

        if (this.recoversAfter < slice) {
            this.recoversAfter = 0
        }

        this.count++

        return this
    }

    reward(magnitude = 1) {
        this.limit += this.rewardAmt * magnitude

        if (this.limit > this.upper) {
            this.limit = this.upper
        }

        this.breaksCount = 0

        return this
    }

    penalize(magnitude = 1) {
        this.limit += this.penaltyAmt * magnitude

        if (this.limit < this.lower) {
            this.limit = this.lower
        }

        return this
    }

    break() {
        this.breaksCount++

        if (this.breaksCount === this.breaksAfter) {
            this.recoversAfter = this.slice + this.breakDuration
        }

        return this
    }

    unbreak() {
        this.breaksCount = 0

        return this
    }

    isOpen() {
        return (this.recoversAfter !== 0)
    }

    isOver() {
        return (this.count > this.limit)
    }
}

module.exports = ElasticCounter
