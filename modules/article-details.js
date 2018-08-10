const GettyClient = require('gettyimages-api')

const { 
    ArticlePreprocessor, 
    KeywordsPreprocessor, 
    Matcher,
    StatisticalSearchTermExtractor
} = require('picpic-core')

const { GETTYAPI_DEFAULT_FIELDS } = require('../config/main.config')

const GETTYAPI_KEY = process.env.GETTYAPI_KEY
const GETTYAPI_SECRET = process.env.GETTYAPI_SECRET

if (!GETTYAPI_KEY || !GETTYAPI_SECRET) {
    let LOGGER = new Logger('getty/api')
    LOGGER.error('Please provide credentials for Getty API in environment variables ' +
        'GETTYAPI_KEY and GETTYAPI_SECRET. Exiting.')
    process.exit(1)
}

const credentials = {
    apiKey: GETTYAPI_KEY,
    apiSecret: GETTYAPI_SECRET
}

const Getty = new GettyClient(credentials)

async function preprocessArticle (articleData) {
    let paragraphs = articleData.article.paragraphs
    paragraphs.unshift({
        type: 'H1',
        content: articleData.article.headline
    })
    let articlePreprocessor = new ArticlePreprocessor(paragraphs)
    await articlePreprocessor.preprocess()
    return articlePreprocessor
}

async function matchKeywords (articleData) {
    let articlePreprocessor = await preprocessArticle(articleData)
    let keywordsPreprocessor = new KeywordsPreprocessor(articleData.leadImage)
    await keywordsPreprocessor.preprocess()
    let matcher = new Matcher(articlePreprocessor.getStemmedTerms(), 
        keywordsPreprocessor.extendedKeywordList)
    matcher.match()
    return matcher
}

function getTerms (matcher, keyword, filterSingleTerms) {
    let terms = keyword ? matcher.getKeywordTerms() : matcher.getNonKeywordTerms()
    return filterSingleTerms
        ? terms.filter(term => term.termFrequency > 1)
        : terms
}

function transformToPoints (terms, xKey, yKey, labelKey) {
    return terms.map(term => {
        return { x: term[xKey], y: term[yKey], label: term[labelKey] }
    })
}

async function get2DPlotData(articleData, xKey, yKey, labelKey, filterSingleTerms) {
    let matcher = await matchKeywords(articleData)
    let nonKeywordTerms = getTerms(matcher, false, filterSingleTerms)
    let keywordTerms = getTerms(matcher, true, filterSingleTerms)
    return {
        nonKeywordTerms: transformToPoints(nonKeywordTerms, xKey, yKey, labelKey),
        keywordTerms: transformToPoints(keywordTerms, xKey, yKey, labelKey)
    }
}

async function pickImageStatistical (articleData, threshold, sortOrder) {
    let articlePreprocessor = await preprocessArticle(articleData)
    let searchTermExtractor = new StatisticalSearchTermExtractor(
        articlePreprocessor.stemmedUniqueTerms, threshold)
    let queryString = searchTermExtractor.generateSearchTerm()
    try {
        let apiRequest = Getty.searchimages()
            .withPhrase(queryString)
            .withSortOrder(sortOrder)
        for (let field of GETTYAPI_DEFAULT_FIELDS) {
            apiRequest.withResponseField(field)
        }
        let apiResponse = await apiRequest.execute()
        let image = apiResponse.images[0]
        return {
            queryString,
            queryTerms: searchTermExtractor.getKeywords(),
            image: {
                id: image.id,
                title: image.title,
                caption: image.caption,
                previewUrl: image.display_sizes.filter(s => s.name === 'comp')[0].uri,
                detailUrl: image.referral_destinations.filter(d => d.site_name === 'gettyimages')[0].uri
            }
        }
    } catch (error) {
        console.log(error)
    }
} 

module.exports= {
    matchKeywords,
    get2DPlotData,
    pickImageStatistical
}