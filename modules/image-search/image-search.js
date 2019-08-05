const config = require('config')
const GettyClient = require('./_getty')
const BingClient = require('./_bing')

let ImageSearch = function () {

    let validClients = config.get('validImageClients')
    let clientIdentifier = config.get('imageClient') || 'getty'
    if (validClients.indexOf(clientIdentifier) < 0) {
        console.error(`"${clientIdentifier}" is not a valid image client`)
        process.exit(1)
    }

    switch (clientIdentifier) {
        case 'bing': 
            this.client = new BingClient()
            break
        case 'getty':
        default:
            this.client = new GettyClient()
    }
}

ImageSearch.prototype.search = async function (query, sortOrder) {
    if (this.client.search) {
        return await this.client.search(query, sortOrder)
    } else {
        throw new Error('Image client must implement search() method')
    }
}

module.exports = ImageSearch
