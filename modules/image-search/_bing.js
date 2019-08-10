const config = require('config')
const ImageSearchAPIClient = require('azure-cognitiveservices-imagesearch')
const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials

let BingClient = function () {

    const AZURE_KEY = config.get('azure.key')

    if (!AZURE_KEY) {
        console.error('Please provide credentials for Azure Cognitive Service API ' +
            'in the environment variable AZURE_KEY. Exiting.')
        process.exit(1)
    }

    const azureCredentials = new CognitiveServicesCredentials(AZURE_KEY)

    this.api = new ImageSearchAPIClient(azureCredentials)
    
    this.search = async function (query, sortOrder, numImages) {
        let rawImages = await this.api.imagesOperations.search(query, {
            count: numImages
        })
        return rawImages.value.map(img => {
            return {
                id: img.imageId,
                title: img.name,
                caption: "Image via <a href=\"https://www.bing.com/images/search\">Bing Image Search</a>",
                previewUrl: img.thumbnailUrl,
                detailUrl: img.webSearchUrl
            }
        })
    }
}

module.exports = BingClient
