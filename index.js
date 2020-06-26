"use strict"

const ElasticCounter = require('./lib/elastic_counter')
const InMemoryStore = require('./lib/inmemory_store')
const middleware = require('./lib/middleware')
const { useStore, CountersStore } = require('./lib/counters_store')

useStore(new InMemoryStore())

module.exports = {
    ElasticCounter,
    CountersStore,
    InMemoryStore,
    useStore,
    koa: middleware.koa,
    express: middleware.express,
    axios: middleware.axios,
}
