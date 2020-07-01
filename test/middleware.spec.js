const Koa = require('koa')
const Express = require("express");
const Axios = require('axios');
const serverReady = require('simdummy').test
const { createStubInstance, stub, match } = require('sinon')
const { expect } = require('chai').use(require('chai-as-promised'))
const { IncomingMessage, ServerResponse } = require('http')
const { ElasticCounter, useStore, koa, express, axios } = require('../')

describe('middleware', () => {
    function setupTest() {
        const key = 'test'
        const options = {
            limit: 1
        }

        const counterStub = createStubInstance(ElasticCounter)
        counterStub.tick.returns(counterStub)
        counterStub.reward.returns(counterStub)
        counterStub.penalize.returns(counterStub)
        counterStub.break.returns(counterStub)
        counterStub.unbreak.returns(counterStub)
        counterStub.isOpen.returns(false)
        counterStub.isOver.returns(false)

        const store = useStore()
        store.set(key, counterStub)

        const req = new IncomingMessage()
        const res = new ServerResponse(req)

        const next = () => { }

        const koaApp = new Koa()
        const koaContextStub = stub(koaApp.createContext(req, res))
        koaContextStub.response = {}
        koaContextStub.res = res

        const expressApp = Express()
        const expressResStub = stub(expressApp.response)
        expressResStub.status.returns(expressResStub)

        const axiosInstance = Axios.create()

        return {
            key,
            options,
            req,
            res,
            next,
            koaContextStub,
            expressResStub,
            axiosInstance,
            counterStub
        }
    }

    describe('koa', () => {
        it('should use key selector when provided', () => {
            const test = setupTest()
            const subject = koa(() => test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.counterStub.tick.calledOnce).is.true
        })

        it('should tick counter when it is not over', () => {
            const test = setupTest()
            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should respond with 429 when counter is over', () => {
            const test = setupTest()
            test.counterStub.isOver.returns(true)

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.koaContextStub.response.status).is.equal(429)
            expect(test.koaContextStub.body).is.not.empty

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should respond with 503 when circuit is open', () => {
            const test = setupTest()
            test.counterStub.isOpen.returns(true)

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.koaContextStub.response.status).is.equal(503)
            expect(test.koaContextStub.body).is.not.empty

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.notCalled).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should set rate limit headers when verbose option enabled', () => {
            const test = setupTest()
            test.options.verbose = true
            test.counterStub.upper = 10
            test.counterStub.limit = 10
            test.counterStub.count = 1
            test.counterStub.slice = 1e12

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.koaContextStub.set.calledWith('X-RateLimit-Limit', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('X-RateLimit-Remaining', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('X-RateLimit-Reset', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('Retry-After', match.number)).is.false

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should set retry after header when counter is over and verbose option enabled', () => {
            const test = setupTest()
            test.options.verbose = true
            test.counterStub.upper = 10
            test.counterStub.limit = 10
            test.counterStub.count = 11
            test.counterStub.slice = 1e12
            test.counterStub.isOver.returns(true)

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.koaContextStub.set.calledWith('X-RateLimit-Limit', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('X-RateLimit-Remaining', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('X-RateLimit-Reset', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('Retry-After', match.number)).is.true

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should set retry after header when counter is open and verbose option enabled', () => {
            const test = setupTest()
            test.options.verbose = true
            test.counterStub.upper = 10
            test.counterStub.limit = 10
            test.counterStub.count = 11
            test.counterStub.slice = 1e12
            test.counterStub.isOpen.returns(true)

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            expect(test.koaContextStub.set.calledWith('X-RateLimit-Limit', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('X-RateLimit-Remaining', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('X-RateLimit-Reset', match.number)).is.true
            expect(test.koaContextStub.set.calledWith('Retry-After', match.number)).is.true

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.false
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should penalize counter when response status means error', () => {
            const test = setupTest()
            test.options.avoidErrors = true
            test.koaContextStub.res.statusCode = 500

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            test.res.emit('finish')

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.calledOnce).is.true
            expect(test.counterStub.break.calledOnce).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should penalize counter when response latency exceeds treshold', () => {
            const test = setupTest()
            test.options.avoidLatency = 1e-6

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            test.res.emit('finish')

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.calledOnce).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should penalize counter when client disconnects', () => {
            const test = setupTest()
            test.options.avoidDisconnects = true

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            test.res.emit('close')

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.calledOnce).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should reward counter when request handlers performs', () => {
            const test = setupTest()
            test.options.avoidLatency = 1e3

            const subject = koa(test.key, test.options)

            subject(test.koaContextStub, test.next)

            test.res.emit('finish')

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.calledOnce).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })
    })

    describe('express', () => {
        it('should use key selector when provided', () => {
            const test = setupTest()
            const subject = express(() => test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.counterStub.tick.calledOnce).is.true
        })

        it('should tick counter when it is not over', () => {
            const test = setupTest()
            const subject = express(test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should respond with 429 when counter is over', () => {
            const test = setupTest()
            test.counterStub.isOver.returns(true)

            const subject = express(test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.expressResStub.status.calledOnceWithExactly(429)).is.true
            expect(test.expressResStub.end.calledOnceWith(match.string)).is.true

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should respond with 503 when circuit is open', () => {
            const test = setupTest()
            test.counterStub.isOpen.returns(true)

            const subject = express(test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.expressResStub.status.calledOnceWithExactly(503)).is.true
            expect(test.expressResStub.end.calledOnceWith(match.string)).is.true

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.reward.notCalled).is.true
            expect(test.counterStub.penalize.notCalled).is.true
            expect(test.counterStub.break.notCalled).is.true
            expect(test.counterStub.unbreak.notCalled).is.true
            expect(test.counterStub.isOver.notCalled).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should set rate limit headers when verbose option enabled', () => {
            const test = setupTest()
            test.options.verbose = true
            test.counterStub.upper = 10
            test.counterStub.limit = 10
            test.counterStub.count = 1
            test.counterStub.slice = 1e12

            const subject = express(test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.expressResStub.set.calledWith('X-RateLimit-Limit', match.number)).is.true
            expect(test.expressResStub.set.calledWith('X-RateLimit-Remaining', match.number)).is.true
            expect(test.expressResStub.set.calledWith('X-RateLimit-Reset', match.number)).is.true
            expect(test.expressResStub.set.calledWith('Retry-After', match.number)).is.false

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should set retry after header when counter is over and verbose option enabled', () => {
            const test = setupTest()
            test.options.verbose = true
            test.counterStub.upper = 10
            test.counterStub.limit = 10
            test.counterStub.count = 11
            test.counterStub.slice = 1e12
            test.counterStub.isOver.returns(true)

            const subject = express(test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.expressResStub.set.calledWith('X-RateLimit-Limit', match.number)).is.true
            expect(test.expressResStub.set.calledWith('X-RateLimit-Remaining', match.number)).is.true
            expect(test.expressResStub.set.calledWith('X-RateLimit-Reset', match.number)).is.true
            expect(test.expressResStub.set.calledWith('Retry-After', match.number)).is.true

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.true
            expect(test.counterStub.isOpen.calledOnce).is.true
        })

        it('should set retry after header when counter is open and verbose option enabled', () => {
            const test = setupTest()
            test.options.verbose = true
            test.counterStub.upper = 10
            test.counterStub.limit = 10
            test.counterStub.count = 11
            test.counterStub.slice = 1e12
            test.counterStub.isOpen.returns(true)

            const subject = express(test.key, test.options)

            subject(test.req, test.expressResStub, test.next)

            expect(test.expressResStub.set.calledWith('X-RateLimit-Limit', match.number)).is.true
            expect(test.expressResStub.set.calledWith('X-RateLimit-Remaining', match.number)).is.true
            expect(test.expressResStub.set.calledWith('X-RateLimit-Reset', match.number)).is.true
            expect(test.expressResStub.set.calledWith('Retry-After', match.number)).is.true

            expect(test.counterStub.tick.calledOnce).is.true
            expect(test.counterStub.isOver.calledOnce).is.false
            expect(test.counterStub.isOpen.calledOnce).is.true
        })
    })

    describe('axios', () => {
        it('should use key selector when provided', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                const subject = axios(test.axiosInstance, () => test.key, test.options)

                await subject.get(`http://localhost:${port}/?l=1`)

                expect(test.counterStub.tick.calledOnce).is.true
            })
        })

        it('should tick and reward counter when it is not over', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                const subject = axios(test.axiosInstance, test.key, test.options)

                await subject.get(`http://localhost:${port}/?l=1`)

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.calledOnce).is.true
                expect(test.counterStub.penalize.notCalled).is.true
                expect(test.counterStub.break.notCalled).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })

        it('should throw when circuit is open', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.counterStub.isOpen.returns(true)
                test.counterStub.recoversAfter = 1

                const subject = axios(test.axiosInstance, test.key, test.options)

                await expect(subject.get(`http://localhost:${port}/?l=1`))
                    .to.eventually.be.rejected
                    .and.be.an.instanceOf(Error)
                    .and.have.key('retryAfter')

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.notCalled).is.true
                expect(test.counterStub.break.notCalled).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.notCalled).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })


        it('should throw when counter is over', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.counterStub.isOver.returns(true)

                const subject = axios(test.axiosInstance, test.key, test.options)

                await expect(subject.get(`http://localhost:${port}/?l=1`))
                    .to.eventually.be.rejected
                    .and.be.an.instanceOf(Error)
                    .and.have.key('retryAfter')

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.notCalled).is.true
                expect(test.counterStub.break.notCalled).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })

        it('should penalize counter when response status means error', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.options.avoidErrors = true

                const subject = axios(test.axiosInstance, test.key, test.options)

                await expect(subject.get(`http://localhost:${port}/?l=1&s=500`))
                    .to.eventually.be.rejected

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.calledOnce).is.true
                expect(test.counterStub.break.calledOnce).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })

        it('should penalize counter when response status means error and axios does not throw', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.options.avoidErrors = true

                const subject = axios(test.axiosInstance, test.key, test.options)

                await subject.get(`http://localhost:${port}/?l=1&s=500`, { validateStatus: _ => true })

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.calledOnce).is.true
                expect(test.counterStub.break.calledOnce).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })

        it('should penalize counter when response latency exceeds treshold', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.options.avoidLatency = 1

                const subject = axios(test.axiosInstance, test.key, test.options)

                await subject.get(`http://localhost:${port}/?l=2`)

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.calledOnce).is.true
                expect(test.counterStub.break.notCalled).is.true
                expect(test.counterStub.unbreak.calledOnce).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })

        it('should not penalize counter when status means error and it was removed from store', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.options.avoidErrors = true
                test.axiosInstance.interceptors.request.use(function (config) {
                    useStore().set(config._counter_key, undefined)
                    return config
                })

                const subject = axios(test.axiosInstance, test.key, test.options)

                await expect(subject.get(`http://localhost:${port}/?l=1&s=500`))
                    .to.eventually.be.rejected

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.notCalled).is.true
                expect(test.counterStub.break.notCalled).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })

        it('should not penalize counter when response latency exceeds treshold and it was removed from store', async () => {
            await serverReady(async (port) => {
                const test = setupTest()
                test.options.avoidLatency = 1
                test.axiosInstance.interceptors.request.use(function (config) {
                    useStore().set(config._counter_key, undefined)
                    return config
                })

                const subject = axios(test.axiosInstance, test.key, test.options)

                await subject.get(`http://localhost:${port}/?l=2`)

                expect(test.counterStub.tick.calledOnce).is.true
                expect(test.counterStub.reward.notCalled).is.true
                expect(test.counterStub.penalize.notCalled).is.true
                expect(test.counterStub.break.notCalled).is.true
                expect(test.counterStub.unbreak.notCalled).is.true
                expect(test.counterStub.isOver.calledOnce).is.true
                expect(test.counterStub.isOpen.calledOnce).is.true
            })
        })
    })
})
