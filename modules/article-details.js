const config = require('config')
const GettyClient = require('gettyimages-api')

const { 
    ArticlePreprocessor, 
    KeywordsPreprocessor, 
    Matcher,
    StatisticalSearchTermExtractor,
    LearningSearchTermExtractor
} = require('picpic-core')

const GETTYAPI_KEY = config.get('gettyAPI.key')
const GETTYAPI_SECRET = config.get('gettyAPI.secret')
const GETTYAPI_DEFAULT_FIELDS = config.get('gettyAPI.defaultFields')

if (!GETTYAPI_KEY || !GETTYAPI_SECRET) {
    let LOGGER = new Logger('getty/api')
    LOGGER.error('Please provide credentials for Getty API in environment variables ' +
        'GETTYAPI_KEY and GETTYAPI_SECRET. Exiting.')
    process.exit(1)
}

const MODEL_TYPE = config.get('mlModel.type')
const MODEL_PATH = config.get('mlModel.path')
const PREDICTION_FEATURES = config.get('prediction.features')
const NORMALIZE_FEATURES = config.get('prediction.normalizeFeatures')

console.log(PREDICTION_FEATURES)

const credentials = {
    apiKey: GETTYAPI_KEY,
    apiSecret: GETTYAPI_SECRET
}

const Getty = new GettyClient(credentials)

async function preprocessArticle (articleData) {
    let articlePreprocessor = new ArticlePreprocessor(articleData)
    await articlePreprocessor.preprocess()
    return articlePreprocessor
}

async function matchKeywords (articleData) {
    let articlePreprocessor = await preprocessArticle(articleData)
    let keywordsPreprocessor = new KeywordsPreprocessor(articleData.leadImage)
    await keywordsPreprocessor.preprocess()
    let matcher = new Matcher(articlePreprocessor.getProcessedTerms(null, true), 
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

async function pickImage (searchTermExtractor, sortOrder, entitiesOnly, ignoreSuperterms, numImages) {
    const NUM_IMAGES = numImages || 1
    let {query, consideredTerms} = 
        searchTermExtractor.generateSearchTerm(
            entitiesOnly, 
            PREDICTION_FEATURES, 
            NORMALIZE_FEATURES,
            ignoreSuperterms)
    let queryString = query
    try {
        let apiRequest = Getty.searchimages()
            .withPhrase(queryString)
            .withSortOrder(sortOrder)
        for (let field of GETTYAPI_DEFAULT_FIELDS) {
            apiRequest.withResponseField(field)
        }
        let apiResponse = await apiRequest.execute()
        let rawImages = apiResponse.images.slice(0, NUM_IMAGES)
        let images = rawImages.map(img => {
            return {
                id: img.id,
                title: img.title,
                caption: img.caption,
                previewUrl: img.display_sizes.filter(s => s.name === 'comp')[0].uri,
                detailUrl: img.referral_destinations.filter(d => d.site_name === 'gettyimages')[0].uri
            }
        })
        return {
            queryString,
            queryTerms: consideredTerms,
            images
        }
    } catch (error) {
        console.log(error)
        return null
    }
}

async function pickImageStatistical (articleData, threshold, sortOrder, numImages) {
    let articlePreprocessor = await preprocessArticle(articleData)
    let searchTermExtractor = new StatisticalSearchTermExtractor(
        articlePreprocessor.getProcessedTerms(null, false, true), threshold)
    return await pickImage(searchTermExtractor, sortOrder, false, false, numImages)
}

async function pickImageMachineLearning (articleData, threshold, sortOrder, entitiesOnly, numImages) {
    let articlePreprocessor = await preprocessArticle(articleData)
    let searchTermExtractor = new LearningSearchTermExtractor(
        MODEL_TYPE, MODEL_PATH, articlePreprocessor.getProcessedTerms(), threshold)
    return await pickImage(searchTermExtractor, sortOrder, entitiesOnly, true, numImages)
}

module.exports= {
    matchKeywords,
    get2DPlotData,
    pickImageStatistical,
    pickImageMachineLearning
}