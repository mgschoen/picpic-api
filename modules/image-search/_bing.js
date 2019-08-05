let BingClient = function () {
    
    this.search = function (query) {
        return `Bing is searching for ${query}...`
    }
}

module.exports = BingClient
