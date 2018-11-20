const config = require('config')

const MongoStorage = require('./storage-mongo')
const { 
    matchKeywords, 
    get2DPlotData, 
    pickImageStatistical,
    pickImageMachineLearning
} = require('./article-details')
const getCalaisData = require('./calais')

const VALID_APPROACHES = config.get('validApproaches')

let RouteConfig = async function () {

    this.mongo = new MongoStorage()
    await this.mongo.init()

    this.picpic = async (articleObject, req, res) => {
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
        let numImages = parseInt(req.query.numImages) || 1
        if (numImages < 1) numImages = 1
        if (numImages > 20) numImages = 20
        let data
        switch (approach) {
            case 'ml':
                data = await pickImageMachineLearning(articleObject, threshold, sortOrder, false, numImages)
                break
            case 'ml-entities':
                data = await pickImageMachineLearning(articleObject, threshold, sortOrder, true, numImages)
                break
            case 'stat':
            default:
                data = await pickImageStatistical(articleObject, threshold, sortOrder, numImages)
        }
        res.json(data)
    }

    this.articlePicpic = (req, res) => {
        let id = req.params.id
        this.mongo.getArticle(id).then(async result => {
            this.picpic(result, req, res)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    }

    this.customPicpic = async (req, res) => {
        let plainText = req.body
        let paragraphs = plainText.split('\n')
            .map(text => {return {type: 'P', content: text.trim()}})
            .filter(paragraph => paragraph.content.length > 0)
        let article = {
            article: {
                headline: '',
                paragraphs
            }
        }
        if (['ml', 'ml-entities'].indexOf(req.params.approach) >= 0) {
            try {
                article.calais = await getCalaisData(plainText)
            } catch (e) {
                article.calais = {}
                console.info(`[Info] Performing ML approach without Calais tags due to the following reason: ${e.message}`)
            }
        }
        this.picpic(article, req, res)
    }
    
    this.routes = {
        get: {

            // General
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
        
            // Article specific
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
        
            // Listing and searching articles
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
        },

        post: {
            // Corpus independent
            '/custom/picpic/:approach': this.customPicpic,
            '/custom/picpic/:approach/:threshold': this.customPicpic,
            '/custom/picpic/:approach/:threshold/:sortorder': this.customPicpic
        }
    }
    return this
} 

module.exports = RouteConfig

