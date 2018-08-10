let Storage = require('./storage')
let { matchKeywords, get2DPlotData, pickImageStatistical } = require('./article-details')

let articlePicpicStat = (req, res) => {
    let id = parseInt(req.params.id)
    let threshold = parseFloat(req.params.threshold)
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        threshold = 0.5
    }
    let sortOrder = req.params.sortorder || 'most_popular'
    if (['best_match', 'most_popular', 'newest'].indexOf(sortOrder) < 0) {
        sortOrder = 'most_popular'
    }
    Storage.getArticle(id).then(async result => {
        let data = await pickImageStatistical(result, threshold, sortOrder)
        res.json(data)
    }).catch(error => {
        res.status(500).send(`An error occured: ${error.message}`)
    })
}

module.exports = {
    '/stats': (req, res) => {
        Storage.getStats().then(result => {
            res.json(result)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    },

    '/article/:id': (req, res) => {
        let id = parseInt(req.params.id)
        Storage.getArticle(id).then(result => {
            res.json(result)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    },

    '/article/:id/match': (req, res) => {
        let id = parseInt(req.params.id)
        Storage.getArticle(id).then(async data => {
            if (data.leadImage) {
                let matcher = await matchKeywords(data)
                res.json({
                    stats: matcher.stats,
                    matchedTerms: matcher.matchedTerms
                })
            } else {
                res.status(500).send(`Cannot match image keywords for article $${id}: Article has no lead image.`)
            }
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    },

    '/article/:id/plot/fo-tf': (req, res) => {
        let id = parseInt(req.params.id)
        Storage.getArticle(id).then(async data => {
            if (data.leadImage) {
                let result = await get2DPlotData(data, 'firstOccurrence', 'termFrequency', 'stemmedTerm', true)
                res.json(result)
            } else {
                res.status(500).send(`Cannot match image keywords for article $${id}: Article has no lead image.`)
            }
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    },

    '/article/:id/picpic/stat': articlePicpicStat,
    '/article/:id/picpic/stat/:threshold': articlePicpicStat,
    '/article/:id/picpic/stat/:threshold/:sortorder': articlePicpicStat,

    '/articles/:page': (req, res) => {
        let page = parseInt(req.params.page)
        if (Number.isNaN(page)) {
            res.status(500).send(`/articles/${req.params.page} is not a valid route`)
        } else {
            Storage.getArticleList(page, 20).then(result => {
                res.json(result)
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
            })
        }
    },

    '/articles/gettylead/:page': (req, res) => {
        let page = parseInt(req.params.page)
        Storage.getArticleList(page, 20, true).then(result => {
            res.json(result)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    },

    '/search/:term': (req, res) => {
        let term = req.params.term
        Storage.searchArticles(term).then(result => {
            res.json(result)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
            console.log(error)
        })
    },

    '/search/:term/:page': (req, res) => {
        let term = req.params.term
        let page = parseInt(req.params.page)
        Storage.searchArticles(term, page).then(result => {
            res.json(result)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
            console.log(error)
        })
    }
}