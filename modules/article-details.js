const config = require('config')
const ImageSearch = require('./image-search/image-search')

const ImageSearchClient = new ImageSearch()

const { 
    ArticlePreprocessor, 
    KeywordsPreprocessor, 
    Matcher,
    StatisticalSearchTermExtractor,
    LearningSearchTermExtractor
} = require('picpic-core')

const MODEL_TYPE = config.get('mlModel.type')
const MODEL_PATH = config.get('mlModel.path')
const PREDICTION_FEATURES = config.get('prediction.features')
const NORMALIZE_FEATURES = config.get('prediction.normalizeFeatures')

console.log()
console.log(`Loading ${MODEL_TYPE} model from ${MODEL_PATH}`)
console.log(`Using features: ${PREDICTION_FEATURES.toString()}`)

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
    let {query, consideredTerms} = 
        searchTermExtractor.generateSearchTerm(
            entitiesOnly, 
            PREDICTION_FEATURES, 
            NORMALIZE_FEATURES,
            ignoreSuperterms)
    let queryString = query
    try {
        let images = await ImageSearchClient.search(queryString, sortOrder, numImages)
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