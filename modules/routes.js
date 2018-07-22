let Storage = require('./storage')

module.exports = {
    '/article/:id': (req, res) => {
        let id = parseInt(req.params.id)
        Storage.getArticle(id).then(result => {
            res.json(result)
        }).catch(error => {
            res.statusCode(500).send(`An error occured: ${error.message}`)
        })
    },

    '/articles/:page': (req, res) => {
        let page = parseInt(req.params.page)
        Storage.getArticleList(20, page).then(result => {
            res.json(result)
        }).catch(error => {
            res.statusCode(500).send(`An error occured: ${error.message}`)
        })
    }
}