module.exports = { 
    ElasticFactory: require('./lib/elastic_factory'),
    ElasticCounter: require('./lib/elastic_counter'),
    create: function () {
        return new this.ElasticFactory()
    },
    global: function () {
        return this.instance || (this.instance = this.create())
    },
}
