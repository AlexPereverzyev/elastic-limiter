module.exports = { 
    ElasticCounter: require('./lib/elastic_counter'),
    create: function () {
        return new this.ElasticCounter()
    },
    global: function () {
        return this.instance || (this.instance = this.create())
    },
}
