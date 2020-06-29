const { expect } = require('chai').use(require('chai-as-promised'))

const { ElasticCounter, seconds } = require('../')

describe('elastic-counter', () => {
    it('should use defaults when constructor options are not provided', () => {
        const counter = new ElasticCounter()

        expect(counter).has.keys
        expect(counter.limit).is.equal(counter.upper)
        expect(counter.upper).is.greaterThan(0)
        expect(counter.lower).is.greaterThan(0)
        expect(counter.interval).is.greaterThan(0)
        expect(counter.rewardAmt).is.not.null
        expect(counter.penaltyAmt).is.not.null
        expect(counter.breaksAfter).is.equal(0)
        expect(counter.breakDuration).is.greaterThan(0)
        expect(counter.recoversAfter).is.equal(0)
        expect(counter.count).is.equal(0)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.slice).is.greaterThan(0)
    })

    it('should use constructor options when provided', () => {
        const counter = new ElasticCounter({
            upper: 10,
            lower: 1,
            interval: 60,
            reward: 1,
            penalty: -1,
            breaksAfter: 10,
            breakDuration: 70
        })

        expect(counter).has.keys
        expect(counter.limit).is.equal(counter.upper)
        expect(counter.upper).is.equal(10)
        expect(counter.lower).is.equal(1)
        expect(counter.interval).is.equal(60)
        expect(counter.rewardAmt).is.equal(1)
        expect(counter.penaltyAmt).is.equal(-1)
        expect(counter.breaksAfter).is.equal(10)
        expect(counter.breakDuration).is.equal(70)
        expect(counter.recoversAfter).is.equal(0)
        expect(counter.count).is.equal(0)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.slice).is.greaterThan(0)
    })

    it('should set upper and lower bounds when limit option provided', () => {
        const counter = new ElasticCounter({ limit: 1 })

        expect(counter.limit).is.equal(counter.upper)
        expect(counter.upper).is.equal(1)
        expect(counter.lower).is.equal(1)
    })

    it('should parse intervals when interval strings options provided', () => {
        const counter = new ElasticCounter({ limit: 1, interval: '00:01:00', breakDuration: '00:01:10' })

        expect(counter.interval).is.equal(60)
        expect(counter.breakDuration).is.equal(70)
    })

    it('should increment counter when ticking', () => {
        const counter = new ElasticCounter({ limit: 10 })

        counter.tick()
        counter.tick()
        counter.tick()
        counter.tick()
        counter.tick()

        expect(counter.slice).is.greaterThan(0)
        expect(counter.count).is.equal(5)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.equal(0)
    })

    it('should use tick time slice when provided', () => {
        const counter = new ElasticCounter({ limit: 10 })

        const now = 1e12
        counter.tick(now)

        expect(counter.slice).is.equal(now)
        expect(counter.count).is.greaterThan(0)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.equal(0)
    })

    it('should be over when upper limit exceeded', () => {
        const counter = new ElasticCounter({ limit: 2 })
        const now = 1e12

        counter.tick()
        counter.tick()
        counter.tick()

        expect(counter.slice).is.greaterThan(0)
        expect(counter.count).is.equal(3)
        expect(counter.isOver()).is.true
    })

    it('should reset state when new time slice starts', () => {
        const counter = new ElasticCounter({ limit: 10 })
        const now = 1e12

        counter.tick()
        counter.tick()
        counter.tick(now)

        expect(counter.slice).is.equal(now)
        expect(counter.count).is.equal(1)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.equal(0)
        expect(counter.isOver()).is.false
    })

    it('should open when breaks count exceeded', () => {
        const counter = new ElasticCounter({ limit: 10, breaksAfter: 1, breakDuration: 60 })

        counter.tick()
        counter.break()

        expect(counter.slice).is.greaterThan(0)
        expect(counter.count).is.equal(1)
        expect(counter.breaksCount).is.equal(1)
        expect(counter.recoversAfter).is.greaterThan(0)
        expect(counter.isOpen()).is.true
    })

    it('should close when new time slice exceeds break duration', () => {
        const counter = new ElasticCounter({ limit: 10, breaksAfter: 1, breakDuration: 60 })
        const now = 1e12

        counter.break()
        counter.tick()
        counter.tick(now)

        expect(counter.slice).is.equal(now)
        expect(counter.count).is.equal(1)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.equal(0)
        expect(counter.isOpen()).is.false
    })

    it('should reset circuit when rewarded', () => {
        const counter = new ElasticCounter({ limit: 10, breaksAfter: 10, breakDuration: 60 })

        counter.tick()
        counter.break()
        counter.reward()

        expect(counter.slice).is.greaterThan(0)
        expect(counter.count).is.equal(1)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.equal(0)
        expect(counter.isOpen()).is.false
    })

    it('should reset circuit when unbroken', () => {
        const counter = new ElasticCounter({ limit: 10, breaksAfter: 10, breakDuration: 60 })

        counter.tick()
        counter.break()
        counter.unbreak()

        expect(counter.slice).is.greaterThan(0)
        expect(counter.count).is.equal(1)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.equal(0)
        expect(counter.isOpen()).is.false
    })

    it('should not close circuit when rewarded', () => {
        const counter = new ElasticCounter({ limit: 10, breaksAfter: 1, breakDuration: 60 })

        counter.tick()
        counter.break()
        counter.unbreak()

        expect(counter.slice).is.greaterThan(0)
        expect(counter.count).is.equal(1)
        expect(counter.breaksCount).is.equal(0)
        expect(counter.recoversAfter).is.greaterThan(0)
        expect(counter.isOpen()).is.true
    })

    it('should become over when penalized', () => {
        const counter = new ElasticCounter({ upper: 5, lower: 1, penalty: -1 })

        counter.tick()
        counter.penalize()
        counter.penalize()
        counter.penalize()
        counter.penalize()
        counter.penalize()
        counter.tick()

        expect(counter.count).is.equal(2)
        expect(counter.limit).is.equal(counter.lower)
        expect(counter.isOver()).is.true
    })

    it('should restore limit when rewarded', () => {
        const counter = new ElasticCounter({ upper: 5, lower: 1, penalty: -1, reward: 1 })

        counter.tick()
        counter.penalize()
        counter.penalize()
        counter.penalize()
        counter.penalize()
        counter.penalize()
        counter.tick()
        counter.reward()
        counter.reward()
        counter.reward()
        counter.reward()
        counter.reward()
        counter.tick()

        expect(counter.count).is.equal(3)
        expect(counter.limit).is.equal(counter.upper)
        expect(counter.isOver()).is.false
    })
})


describe('seconds', () => {
    it('should calculate msec delta when start time provided', () => {
        const start = process.hrtime()
        const delta = seconds.msecond(start)

        expect(delta).is.greaterThan(0)
    })
})
