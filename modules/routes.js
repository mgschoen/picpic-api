const config = require('config')

const MongoStorage = require('./storage-mongo')
const { 
    matchKeywords, 
    get2DPlotData, 
    pickImageStatistical,
    pickImageMachineLearning
} = require('./article-details')

const VALID_APPROACHES = config.get('validApproaches')

let RouteConfig = async function () {

    this.mongo = new MongoStorage()
    await this.mongo.init()

    this.articlePicpic = (req, res) => {
        let id = req.params.id
        let approach = req.params.approach
        if (VALID_APPROACHES.indexOf(approach) < 0) {
            res.status(500).send(`"${approach}" is not a valid approach`)
            return
        }
        let threshold = parseFloat(req.params.threshold)
        if (isNaN(threshold) || threshold < 0 || threshold > 1) {
            threshold = 0.5
        }
        let sortOrder = req.params.sortorder || 'most_popular'
        if (['best_match', 'most_popular', 'newest'].indexOf(sortOrder) < 0) {
            sortOrder = 'most_popular'
        }
        this.mongo.getArticle(id).then(async result => {
            let data
            switch (approach) {
                case 'ml':
                    data = await pickImageMachineLearning(result, threshold, sortOrder, false)
                    break
                case 'ml-entities':
                    data = await pickImageMachineLearning(result, threshold, sortOrder, true)
                    break
                case 'stat':
                default:
                    data = await pickImageStatistical(result, threshold, sortOrder)
            }
            res.json(data)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    }
    
    this.routes = {
        '/stats': (req, res) => {
            this.mongo.getStats().then(result => {
                res.json(result)
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
            })
        },
    
        '/article/:id': (req, res) => {
            let id = req.params.id
            this.mongo.getArticle(id).then(result => {
                res.json(result)
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
            })
        },
    
        '/article/:id/match': (req, res) => {
            let id = req.params.id
            this.mongo.getArticle(id).then(async data => {
                if (data.leadImage) {
                    let matcher = await matchKeywords(data)
                    res.json({
                        stats: matcher.stats,
                        matchedTerms: matcher.getKeywordTerms()
                    })
                } else {
                    res.status(500).send(`Cannot match image keywords for article ${id}: Article has no lead image.`)
                }
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
            })
        },
    
        '/article/:id/plot/fo-tf': (req, res) => {
            let id = req.params.id
            this.mongo.getArticle(id).then(async data => {
                if (data.leadImage) {
                    let result = await get2DPlotData(data, 'firstOccurrence', 'termFrequency', 'stemmedTerm', true)
                    res.json(result)
                } else {
                    res.status(500).send(`Cannot get plot data for article ${id}: Article has no lead image.`)
                }
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
            })
        },
    
        '/article/:id/picpic/:approach': this.articlePicpic,
        '/article/:id/picpic/:approach/:threshold': this.articlePicpic,
        '/article/:id/picpic/:approach/:threshold/:sortorder': this.articlePicpic,
    
        '/articles/:page': (req, res) => {
            let page = parseInt(req.params.page)
            if (Number.isNaN(page)) {
                res.status(500).send(`/articles/${req.params.page} is not a valid route`)
            } else {
                this.mongo.getArticleList(page, 20).then(result => {
                    res.json(result)
                }).catch(error => {
                    res.status(500).send(`An error occured: ${error.message}`)
                })
            }
        },
    
        '/articles/gettylead/:page': (req, res) => {
            let page = parseInt(req.params.page)
            this.mongo.getArticleList(page, 20, true).then(result => {
                res.json(result)
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
            })
        },
    
        '/search/:term': (req, res) => {
            let term = req.params.term
            this.mongo.searchArticles(term).then(result => {
                res.json(result)
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
                console.log(error)
            })
        },
    
        '/search/:term/:page': (req, res) => {
            let term = req.params.term
            let page = parseInt(req.params.page)
            this.mongo.searchArticles(term, page).then(result => {
                res.json(result)
            }).catch(error => {
                res.status(500).send(`An error occured: ${error.message}`)
                console.log(error)
            })
        }
    }
    return this
} 

module.exports = RouteConfig

