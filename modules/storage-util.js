/**
 * Removes a bunch of details from a list of articles
 * @param {array} articleList 
 * @returns {array}
 */
function reduceArticleList (articleList) {
    return articleList.map(doc => {
        let { teaser, section, url, published, _id } = doc
        let reducedObject = { teaser, section, url, published, id: _id.toString() }
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
    })
}

module.exports = { reduceArticleList }