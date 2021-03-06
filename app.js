const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const minimist = require('minimist')
const config = require('config')

const RouteConfig = require('./modules/routes/routes')

const PORT = process.env.PORT || config.get('port')

let args = minimist(process.argv.slice(2)) || {}
for (let arg in args) {
    switch (arg) {
        case '_':
            break;
        case 'p':
        case 'port':
            PORT = parseInt(args[arg])
            break;
        default:
            console.log(`Unknown argument ${arg}`)
    }
}

// Enable CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Parse request bodies as text
app.use(bodyParser.text())

// Init routes with storage
RouteConfig().then(routeConfig => {
    let routes = routeConfig.routes
    console.log()
    for (let route in routes.get) {
        console.log(`Intialising GET route ${route}`)
        app.get(route, routes.get[route])
    }
    for (let route in routes.post) {
        console.log(`Intialising POST route ${route}`)
        app.post(route, routes.post[route])
    }
    
    // take off
    app.listen(PORT, () => {
        console.log()
        console.log(`Picpic API listening on port ${PORT}`)
    })
}).catch(error => {
    console.log(error.message)
    console.log(error.stack)
})
