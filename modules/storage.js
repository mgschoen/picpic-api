let Loki = require('lokijs')
const lfsa = require('../node_modules/lokijs/src/loki-fs-structured-adapter')

const { 
    STORAGE_PATH_DEFAULT,
    STORAGE_FILENAME,
    STORAGE_REQUIRED_COLLECTIONS
} = require('../config/main.config')

function initDatabase () {
    return new Promise((resolve, reject) => {
        let adapter = new lfsa()
        let db = new Loki(STORAGE_PATH_DEFAULT + STORAGE_FILENAME, {
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

function getArticle (id) {
    return new Promise((resolve, reject) => {
        initDatabase().then(db => {

            let articlesCollection = db.getCollection('articles')
            let keywordsCollection = db.getCollection('keywords')
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

                resolve(result)

            } else {
                reject(new Error(`Article with id ${id} was not found`))
            }

        }).catch(error => {
            reject(error)
        })
    })
}

function getArticleList (pageSize, page) {
    return new Promise((resolve, reject) => {
        initDatabase().then(db => {

            let collection = db.getCollection('articles')
            let articles = collection.find()
            let firstElementIndex = pageSize * page
            let resultSet = articles.slice(firstElementIndex, firstElementIndex + pageSize)
            resolve(resultSet.map(doc => {
                let { teaser, section, url, published, $loki } = doc
                let reducedObject = { teaser, section, url, published, $loki }
                reducedObject.article = {
                    headline: doc.article.headline,
                    images: doc.article.images
                }
                if (doc.gettyMeta) {
                    reducedObject = {
                        ...reducedObject,
                        gettyMeta: true,
                        leadImage: {
                            id: doc.leadImage.id,
                            title: doc.leadImage.title,
                            url: doc.leadImage.url
                        }
                    }
                }
                if (doc.containsGettyIDInLeadImage) {
                    reducedObject.containsGettyIDInLeadImage = true
                }
                if (doc.containsGettyID) {
                    reducedObject.containsGettyID = true
                }
                return reducedObject
            }))

        }).catch(error => {
            reject(error)
        })
    })
}

module.exports = {
    getArticle,
    getArticleList
}