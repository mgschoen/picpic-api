const config = require('config')
const request = require('request')

const CALAIS_BASEURL = config.get('calais.baseUrl')
const CALAIS_KEY = config.get('calais.key')

if (!CALAIS_KEY) {
    console.error('Please provide credentials for Calais API in environment ' +
        'variable CALAIS_KEY. Exiting.')
    process.exit(1)
}

function insertToDictionary (dictionary, groupString, item) {
    if (dictionary[groupString]) {
        dictionary[groupString].push(item)
    } else {
        dictionary[groupString] = [item]
    }
    return dictionary
}

function groupObjectList (list, groupProperty, includeOther) {
    let groupedList = {}
    for (let key in list) {
        let item = list[key]
        let group = item[groupProperty]
        if (group) {
            insertToDictionary(groupedList, group, item)
        } else if (includeOther) {
            insertToDictionary(groupedList, 'Other', item)
        }
    }
    return groupedList
}

async function getTagsFromAPI (plainText) {

    return new Promise((resolve, reject) => {

        request.post({
            url: CALAIS_BASEURL,
            headers: {
                'Content-Type': 'text/raw',
                'x-ag-access-token': CALAIS_KEY,
                'outputFormat': 'application/json'
            },
            body: plainText
        }, async (error, response, responseBody) => {
    
            if (error) {
                if (this.log) 
                    console.error(error.message)
                reject(error)
                return
            }
    
            if (response.statusCode !== 200) {
                let statusMessage = response.statusMessage
                let reason
                try {
                    let responseObject = JSON.parse(responseBody)
                    reason = (responseObject.fault) ? responseObject.fault.faultstring : 'Reason unknown'
                } catch (error) {
                    reason = responseBody
                }
                let errorMessage = `${statusMessage}: ${reason}`
                if (this.log)
                    console.error(errorMessage)
                reject(new Error(errorMessage))
                return
            }
    
            // Everything ok, start processing the response
            let body = JSON.parse(responseBody)
            let formattedCalais = groupObjectList(body, '_typeGroup', false)
            let entitiesByType = groupObjectList(formattedCalais.entities, '_type', true)
            formattedCalais.entities = entitiesByType
            let relationsByType = groupObjectList(formattedCalais.relations, '_type', true)
            formattedCalais.relations = relationsByType
    
            delete formattedCalais.language
            delete formattedCalais.versions
    
            resolve(formattedCalais)

        })
    })
}

module.exports = getTagsFromAPI