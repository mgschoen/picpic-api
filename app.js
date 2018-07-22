const express = require('express')
const app = express()

app.get('/', (req, res) => {
    res.send('Picpic, who\'s there?')
})

app.listen(3000, () => {
    console.log('Picpic API listening on port 3000')
})