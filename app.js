const express = require('express')
const app = express()
const minimist = require('minimist')
const config = require('config')

const routeConfig = require('./modules/routes')

const PORT = config.get('port')

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
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

for (let route in routeConfig) {
    app.get(route, routeConfig[route])
}

app.listen(PORT, () => {
    console.log(`Picpic API listening on port ${PORT}`)
})