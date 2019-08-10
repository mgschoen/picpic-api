const config = require('config')

const { 
    pickImageStatistical,
    pickImageMachineLearning
} = require('../article-details')
const getCalaisData = require('../calais')

const VALID_APPROACHES = config.get('validApproaches')

let RouteConfig = async function () {

    this.picpic = async (articleObject, req, res) => {
        let approach = req.params.approach
        if (VALID_APPROACHES.indexOf(approach) < 0) {
            res.status(500).send(`"${approach}" is not a valid approach`)
            return
        }
        let threshold = parseFloat(req.query.threshold)
        if (isNaN(threshold) || threshold < 0 || threshold > 1) {
            threshold = 0.5
        }
        let sortOrder = req.query.sortOrder || 'most_popular'
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
            "/awake": (req, res) => {
                res.json({awake: true})
            }
        },
        post: {
            // Corpus independent
            '/custom/picpic/:approach': this.customPicpic
        }
    }

    if (config.get('mode') === 'explorer') {
        let ExplorerRoutes = require('./_explorer')
        let explorerRoutes = new ExplorerRoutes(this.picpic)
        await explorerRoutes.init()
        for (let route in explorerRoutes.routes.get) {
            this.routes.get[route] = explorerRoutes.routes.get[route]
        }
    } 

    return this
} 

module.exports = RouteConfig

