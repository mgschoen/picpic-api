let Storage = require('./storage')

module.exports = {
    '/article/:id': (req, res) => {
        let id = parseInt(req.params.id)
        Storage.getArticle(id).then(result => {
            res.json(result)
        }).catch(error => {
            res.status(500).send(`An error occured: ${error.message}`)
        })
    },

    '/articles/:page': (req, res) => {
        let page = parseInt(req.params.page)
        Storage.getArticleList(page, 20).then(result => {
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