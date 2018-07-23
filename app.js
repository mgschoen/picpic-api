const express = require('express')
const app = express()
const minimist = require('minimist')

const routeConfig = require('./modules/routes')

const {
    PORT_DEFAULT
} = require('./config/main.config')

let port = PORT_DEFAULT

let args = minimist(process.argv.slice(2)) || {}
for (let arg in args) {
    switch (arg) {
        case '_':
            break;
        case 'p':
        case 'port':
            port = parseInt(args[arg])
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

app.listen(port, () => {
    console.log(`Picpic API listening on port ${port}`)
})