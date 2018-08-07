let { ArticlePreprocessor, KeywordsPreprocessor, Matcher } = require('picpic-core')

async function matchKeywords (articleData) {
    let paragraphs = articleData.article.paragraphs
    paragraphs.unshift({
        type: 'H1',
        content: articleData.article.headline
    })
    let articlePreprocessor = new ArticlePreprocessor(paragraphs)
    let keywordsPreprocessor = new KeywordsPreprocessor(articleData.leadImage)
    await articlePreprocessor.preprocess()
    await keywordsPreprocessor.preprocess()
    let matcher = new Matcher(articlePreprocessor.getStemmedTerms(), 
        keywordsPreprocessor.extendedKeywordList)
    matcher.match()
    return matcher
}

function getTerms (matcher, keyword, filterUniqueTerms) {
    let terms = keyword ? matcher.getKeywordTerms() : matcher.getNonKeywordTerms()
    return filterUniqueTerms
        ? terms.filter(term => term.termFrequency > 1)
        : terms
}

function transformToPoints (terms, xKey, yKey, labelKey) {
    return terms.map(term => {
        return { x: term[xKey], y: term[yKey], label: term[labelKey] }
    })
}

async function get2DPlotData(articleData, xKey, yKey, labelKey, filterUniqueTerms) {
    let matcher = await matchKeywords(articleData)
    let nonKeywordTerms = getTerms(matcher, false, filterUniqueTerms)
    let keywordTerms = getTerms(matcher, true, filterUniqueTerms)
    return {
        nonKeywordTerms: transformToPoints(nonKeywordTerms, xKey, yKey, labelKey),
        keywordTerms: transformToPoints(keywordTerms, xKey, yKey, labelKey)
    }
}

module.exports= {
    matchKeywords,
    get2DPlotData
}