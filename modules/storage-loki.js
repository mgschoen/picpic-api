const config = require('config')
const fs = require('fs')
const Loki = require('lokijs')
const lfsa = require('lokijs/src/loki-fs-structured-adapter')
const folderSize = require('get-folder-size')

const STORAGE_PATH = config.get('storage.path') // need to add env var support?
const STORAGE_FILENAME = config.get('storage.filename')
const STORAGE_REQUIRED_COLLECTIONS = config.get('storage.requiredCollections')

const { reduceArticleList } = require('./storage-util')

/**
 * Splits `array` into windows of size `pageSize` and returns
 * the window with index `page` along with some pagination metadata
 * @param {array} array list of elements for pagination
 * @param {number} page index of page to return
 * @param {number} pageSize number of elements per page
 * @returns {object}
 */
function paginate (array, page, pageSize) {
    let firstElementIndex = pageSize * page
    let resultSet = array.slice(firstElementIndex, firstElementIndex + pageSize)
    return {
        pagination: {
            previous: page > 0,
            next: ((pageSize * page) + pageSize) < array.length,
            itemsTotal: array.length,
            itemsInPage: resultSet.length,
            pagesTotal: Math.ceil(array.length / pageSize),
            pageIndex: page
        },
        result: resultSet
    }
}

/**
 * Connect to the Loki.js database at the location specified
 * in the config file
 * @returns {Promise} resolves to database instance if successful
 */
function initDatabase () {
    return new Promise((resolve, reject) => {
        let adapter = new lfsa()
        let db = new Loki(STORAGE_PATH + STORAGE_FILENAME, {
            adapter: adapter
        })
        db.loadDatabase({}, err => {
            if (err) {
                reject(err)
                return
            }

            let missingCollections = []
            for (let collectionName of STORAGE_REQUIRED_COLLECTIONS) {
                let collection = db.getCollection(collectionName)
                if (!collection) {
                    missingCollections.push(collectionName)
                }
            }

            if (missingCollections.length > 0) {
                reject(new Error(`Could not find required collection(s) ${missingCollections}`))
                return
            }

            resolve(db)
        })
    })
}

/**
 * Query the database for an article with a specific ID.
 * @param {number} id a Loki.js id
 * @returns {Promise} resolves to an article object
 */
function getArticle (id) {
    return new Promise((resolve, reject) => {
        initDatabase().then(db => {

            let articlesCollection = db.getCollection('articles')
            let keywordsCollection = db.getCollection('keywords')
            let calaisCollection = db.getCollection('calais')
            let article = articlesCollection.findOne({$loki: id})
            if (article) {

                let result = { ...article }
                delete result.meta

                if (result.leadImage) {
                    let keywordIDs = result.leadImage.keywords
                    let keywords = keywordsCollection.find({$loki: { $in: keywordIDs }})
                    let processedKeywords = keywords.map(kw => {
                        let processedKW = {...kw}
                        delete processedKW.meta
                        delete processedKW.$loki
                        return processedKW
                    })
                    result.leadImage.keywords = processedKeywords
                }

                if (result.calaisTags) {
                    let calaisEntry = { ...calaisCollection.findOne({forArticle: result.$loki}) }
                    delete calaisEntry.meta
                    delete calaisEntry.$loki
                    delete calaisEntry.forArticle
                    result.calais = calaisEntry
                }

                resolve(result)

            } else {
                reject(new Error(`Article with id ${id} was not found`))
            }

        }).catch(error => {
            reject(error)
        })
    })
}

/**
 * Get one page from the paginated list of all articles, where
 * each page hast `pageSize` entries
 * @param {number} page index of the page to request
 * @param {number} pageSize number of articles per page
 * @returns {Promise} resolves to a paginated list of article objects
 */
function getArticleList (page, pageSize, gettyLead) {
    return new Promise((resolve, reject) => {
        initDatabase().then(db => {

            let collection = db.getCollection('articles')
            let query = gettyLead ? { gettyMeta: true } : {}
            let articles = collection.find(query)
            let windowWidth = pageSize || 20
            let window = paginate(articles, page, windowWidth)
            window.result = reduceArticleList(window.result)
            resolve(window)

        }).catch(error => {
            reject(error)
        })
    })
}

/**
 * Queries the collection for articles that contain the search 
 * term and returns the results in paginated form
 * @param {string} term search term
 * @param {number} [page=0] index of page to return from result list
 * @param {number} [pageSize=20] size of a page in result list
 * @returns {Promise} resolves to paginated list of articles objects
 */
function searchArticles (term, page, pageSize) {
    return new Promise((resolve, reject) => {
        initDatabase().then(db => {

            let collection = db.getCollection('articles')
            let searchResults = collection.find({'teaser.headline': {$regex: new RegExp(term, 'i')}})
            let pageIndex = page || 0
            let windowWidth = pageSize || 20
            let window = paginate(searchResults, pageIndex, windowWidth)
            window.result = reduceArticleList(window.result)
            resolve(window)

        }).catch(error => {
            reject(error)
        })
    })
}

function getStats () {
    return new Promise((resolve, reject) => {
        initDatabase().then(db => {

            let articles = db.getCollection('articles')
            let keywords = db.getCollection('keywords')
            folderSize(STORAGE_PATH, (error, size) => {
                if (error) {
                    reject(error)
                } else {
                    resolve({
                        articlesTotal: articles.count(),
                        articlesGettyID: articles.find({containsGettyID: true}).length,
                        articlesGettyLead: articles.find({containsGettyIDInLeadImage: true}).length,
                        keywordsTotal: keywords.count(),
                        storageSize: size,
                        storageModified: fs.statSync(STORAGE_PATH + STORAGE_FILENAME).mtimeMs
                    })
                }
            })

        }).catch(error => {
            reject(error)
        })
    })
}

module.exports = {
    getArticle,
    getArticleList,
    searchArticles,
    getStats
}