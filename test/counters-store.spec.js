const { expect } = require('chai').use(require('chai-as-promised'))

const { CountersStore, InMemoryStore, useStore } = require('../')

describe('counters-store', () => {
    it('should throw when try to start new counter', () => {
        const store = new CountersStore()

        expect(() => store.start('key')).to.throw()
        expect(() => store.get('key')).to.throw()
    })

    it('should throw when try to persist existing counter', () => {
        const store = new CountersStore()

        expect(() => store.set('key', {})).to.throw()
        expect(() => store.get('key')).to.throw()
    })

    it('should return in-memory store when no store instance provided', () => {
        const current = useStore()

        expect(current).is.an.instanceOf(InMemoryStore)
    })

    it('should return custom store when store instance provided', () => {
        class TestCustomStore extends CountersStore { }

        const oldStore = useStore()

        useStore(new TestCustomStore())
        const current = useStore()

        useStore(oldStore)

        expect(current).is.an.instanceOf(TestCustomStore)
    })
})

describe('inmemory-store', () => {
    it('should start new counter when it does not exist yet', () => {
        const store = new InMemoryStore()

        const counter1 = store.start('key')
        const counter2 = store.get('key')

        expect(counter1).is.not.null
        expect(counter1).is.equal(counter2)
        expect(counter1.limit).is.greaterThan(0)
    })

    it('should not start new counter when it already exists', () => {
        const store = new InMemoryStore()

        const counter1 = store.start('key')
        const counter2 = store.start('key')

        expect(counter1).is.not.null
        expect(counter1).is.equal(counter2)
        expect(counter1.limit).is.greaterThan(0)
    })

    it('should persist counter when key provided', () => {
        const store = new InMemoryStore()

        store.set('key', { limit: 1 })
        const counter = store.get('key')

        expect(counter).is.not.null
        expect(counter.limit).is.greaterThan(0)
    })
})
