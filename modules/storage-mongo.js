const config = require('config')
const { MongoClient, ObjectId } = require('mongodb')

const MONGO_HOST = config.get('storage.host')
const MONGO_PORT = config.get('storage.port')
const MONGO_DB = config.get('storage.db')
const MONGO_REQUIRED_COLLECTIONS = config.get('storage.requiredCollections')

const { reduceArticleList } = require('./storage-util')

/**
 * Splits the elements in `cursor` into windows of size `pageSize` 
 * and returns the window with index `page` along with some 
 * pagination metadata
 * @param {array} cursor MongoDB cursor
 * @param {number} page index of page to return
 * @param {number} pageSize number of elements per page
 * @returns {object}
 */
async function paginate (cursor, page, pageSize) {
    let firstElementIndex = (pageSize * page)
    let total = await cursor.count()
    await cursor.skip(firstElementIndex)
    let resultSet = []
    while(resultSet.length < pageSize && await cursor.hasNext()) {
        resultSet.push(await cursor.next())
    }
    return {
        pagination: {
            previous: page > 0,
            next: ((pageSize * page) + pageSize) < total,
            itemsTotal: total,
            itemsInPage: resultSet.length,
            pagesTotal: Math.ceil(total / pageSize),
            pageIndex: page
        },
        result: resultSet
    }
}

function StorageMongo () {
    this.db = null
    this.ready = false
    this.collections = {}
    for (let collectionName of MONGO_REQUIRED_COLLECTIONS) {
        this.collections[collectionName] = null
    }
}

StorageMongo.prototype.init = async function () {
    let connectionString = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`
    console.log(`Connecting to MongoDB instance ${connectionString} ...`)
    let client = await MongoClient.connect(connectionString, {useNewUrlParser: true})
    this.db = client.db()
    for (let collectionName of MONGO_REQUIRED_COLLECTIONS) {
        let collection = await this.db.collection(collectionName)
        if (collection) {
            this.collections[collectionName] = collection
        } else {
            this.collections[collectionName] = await this.db.createCollection(collectionName)
        }
    }
    this.ready = true
    console.log('Connected.')
}

/**
 * Query the database for an article with a specific ID.
 * @param {number} id a MongoDB id
 * @returns {Promise} resolves to an article object
 */
StorageMongo.prototype.getArticle = async function (id) {
    if (this.ready) {
        
        let queryId = ObjectId(id)
        let articleObject = await this.collections.articles.findOne({_id: queryId})
        if (articleObject) {

            articleObject.id = articleObject._id.toString()
            delete articleObject._id

            // fetch keywords for lead image if present
            if (articleObject.leadImage) {
                let keywordIds = articleObject.leadImage.keywords
                    .map(idString => ObjectId(idString))
                let keywordObjects = await this.collections.keywords
                    .find({_id: {$in: keywordIds}})
                    .map(kw => {
                        let copy = {...kw}
                        delete copy._id
                        return copy
                    })
                    .toArray()
                articleObject.leadImage.keywords = keywordObjects
            }

            // fetch calais tags if present
            let calaisTags = await this.collections.calais.findOne({forArticle: id})
            if (calaisTags) {
                delete calaisTags._id
                delete calaisTags.forArticle
                articleObject.calais = calaisTags
            }

            return articleObject

        } else {
            throw new Error(`Article with id ${id} was not found`)
        }

    } else {
        throw new Error('MongoDB was not initialised.')
    }
}

/**
 * Get one page from the paginated list of all articles, where
 * each page hast `pageSize` entries
 * @param {number} page index of the page to request
 * @param {number} pageSize number of articles per page
 * @returns {Promise} resolves to a paginated list of article objects
 */
StorageMongo.prototype.getArticleList = async function (page, pageSize, gettyLead) {
    if (this.ready) {

        let query = gettyLead ? { gettyMeta: true } : {}
        let windowWidth = pageSize || 20
        let fullArticleList = await this.collections.articles.find(query)
        let window = await paginate(fullArticleList, page, windowWidth)
        window.result = reduceArticleList(window.result)
        return window

    } else {
        throw new Error('MongoDB was not initialised.')
    }
}

/**
 * Queries the collection for articles that contain the search 
 * term and returns the results in paginated form
 * @param {string} term search term
 * @param {number} [page=0] index of page to return from result list
 * @param {number} [pageSize=20] size of a page in result list
 * @returns {Promise} resolves to paginated list of articles objects
 */
StorageMongo.prototype.searchArticles = async function (term, page, pageSize) {
    if (this.ready) {

        let searchRegexp = new RegExp(term, 'gi')
        let query = {$or: [
            {'teaser.headline': {$regex: searchRegexp}},
            {'article.headline': {$regex: searchRegexp}}
        ]}
        let windowWidth = pageSize || 20
        let fullArticleList = await this.collections.articles.find(query)
        let window = await paginate(fullArticleList, page, windowWidth)
        window.result = reduceArticleList(window.result)
        return window

    } else {
        throw new Error('MongoDB was not initialised.')
    }
}

StorageMongo.prototype.getStats = async function () {
    if (this.ready) {

        let articles = this.collections.articles
        let keywords = this.collections.keywords

        let articlesTotal = await articles.countDocuments()
        let articlesGettyID = await articles.countDocuments({containsGettyID: true})
        let articlesGettyLead = await articles.countDocuments({containsGettyIDInLeadImage: true})
        let keywordsTotal = await keywords.countDocuments()
        let dbStats = await this.db.stats()
        return {
            articlesTotal,
            articlesGettyID,
            articlesGettyLead,
            keywordsTotal,
            storageSize: dbStats.storageSize,
            storageModified: 0
        }

    } else {
        throw new Error('MongoDB was not initialised.')
    }
}

module.exports = StorageMongo

