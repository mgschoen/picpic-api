const config = require('config')
const GettyApi = require('gettyimages-api')

const GETTYAPI_KEY = config.get('gettyAPI.key')
const GETTYAPI_SECRET = config.get('gettyAPI.secret')
const GETTYAPI_DEFAULT_FIELDS = config.get('gettyAPI.defaultFields')

if (!GETTYAPI_KEY || !GETTYAPI_SECRET) {
    console.error('Please provide credentials for Getty API in environment variables ' +
        'GETTYAPI_KEY and GETTYAPI_SECRET. Exiting.')
    process.exit(1)
}

let GettyClient = function () {

    this.api = new GettyApi({
        apiKey: GETTYAPI_KEY,
        apiSecret: GETTYAPI_SECRET
    })
    
    this.search = async function (query, sortOrder) {
        try {
            let apiRequest = this.api.searchimages()
                .withPhrase(query)
                .withSortOrder(sortOrder)
            for (let field of GETTYAPI_DEFAULT_FIELDS) {
                apiRequest.withResponseField(field)
            }
            let apiResponse = await apiRequest.execute()
            let rawImages = apiResponse.images.slice(0, NUM_IMAGES)
            return rawImages.map(img => {
                return {
                    id: img.id,
                    title: img.title,
                    caption: img.caption,
                    previewUrl: img.display_sizes.filter(s => s.name === 'comp')[0].uri,
                    detailUrl: img.referral_destinations.filter(d => d.site_name === 'gettyimages')[0].uri
                }
            })
        } catch (error) {
            console.log(error)
            return null
        }
    }
}

module.exports = GettyClient
