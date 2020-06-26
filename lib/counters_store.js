
let currentInstance = null

module.exports = function(instance) {
    if (instance) {
        currentInstance = instance
    }
    return currentInstance
}
