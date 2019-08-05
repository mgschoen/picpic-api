let GettyClient = function () {
    
    this.search = function (query) {
        return `Getty is searching for ${query}...`
    }
}

module.exports = GettyClient
