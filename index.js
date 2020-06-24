"use strict"

const ElasticFactory = require('./lib/elastic_factory')
const ElasticCounter = require('./lib/elastic_counter')
const middleware = require('./lib/middleware')

module.exports = {
    ElasticCounter,
    ElasticFactory,
    current: ElasticFactory.current,
    koa: middleware.koa,
    express: middleware.express,
    axios: middleware.axios,
}
