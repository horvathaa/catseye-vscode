import { v4 as uuidv4 } from 'uuid'
import * as vscode from 'vscode'
import {
    Anchor,
    AnchorObject,
    NUM_SURROUNDING_LINES,
    PotentialAnchorObject,
    HIGH_SIMILARITY_THRESHOLD, // we are pretty confident the anchor is here
    PASSABLE_SIMILARITY_THRESHOLD, // we are confident enough
    INCREMENT,
    AnchorType, // amount for expanding search range
} from '../constants/constants'
import { astHelper, gitInfo } from '../extension'
import {
    arrayUniqueByKey,
    // getFirstLineOfHtml,
    getGithubUrl,
    getProjectName,
    // getShikiCodeHighlighting,
    getVisiblePath,
    levenshteinDistance,
    objectsEqual,
    removeNulls,
} from '../utils/utils'
import {
    createRangeFromObject,
    getAnchorType,
    getSurroundingCodeArea,
    // getSurroundingLinesAfterAnchor,
    // getSurroundingLinesBeforeAnchor,
} from './anchor'

// toggle to true for more console messages
export const REANCHOR_DEBUG: boolean = false
const EXACT = 10
const CLOSE = 4
const NEAR = 3
const FAR = 2
let currDocLength = 0

interface CodeToken {
    token: string
    offset: number
    line?: number // sometimes we need to know what line the token is on *shrug*
}
interface CodeLine {
    code: CodeToken[] | WeightedToken[]
    line: number
    isEmptyLine: boolean
}

// this is stupid and i'm sure there's a better way of doing this
interface WeightedLine {
    code: WeightedToken[]
    line: number
}

interface WeightedCodeLine {
    codeLine: WeightedLine
    weight: number
}

interface WeightedCodeLineRange {
    codeLines: WeightedCodeLine[]
    startLine: number
    endLine: number
    weight: number
}

interface AuditedWeightedCodeLine extends WeightedCodeLine {
    line: number
}
interface WeightedTokenLine extends WeightedToken {
    line: number
}

interface IteratedCodeToken extends CodeToken {
    line: number
    idxOfToken: number
    idxOfLine: number
}

interface WeightedToken extends CodeToken {
    howManyTimesDoesTokenAppear?: number
    howSimilarIsTokenOffset?: number
    editDistance: number
    doesHaveMatch: boolean
    doesContainAnchor?: boolean // use if less token or less anchor
    isExactMatch?: boolean
    weight: number
    howSimilarIsTokenLine: number
    // mostSimilarTokenOnLine: CodeToken
    // mostSimilarTokenInSearchScope: CodeToken
}

interface WeightedAnchor {
    anchor: Anchor
    weight: number
    reasonSuggested: string
}

// consider, for anchor, using saved startOffset as starting value instead of our computed offset vals
// this may.. be a pain
interface StartPosition {
    startLine: number
    startOffset: number
}
export const getCodeLine = (
    text: string,
    start?: StartPosition
): CodeLine[] => {
    //preprocessing potential new anchor ranges
    return text.split('\n').map((t, i) => {
        let n: number[] = []
        let sum = 0
        const splitText = t.split(' ')
        const lengths = splitText.map((t) => t.length)
        lengths.reduce((runningTotal, currentValue, currIndex) => {
            if (currentValue !== 0) n.push(runningTotal + currIndex)
            return runningTotal + currentValue
        }, sum)
        const code: CodeToken[] = t
            .split(' ')
            .filter((c) => c.length)
            .map((c, idx) => {
                return {
                    token: c
                        .replace(/(?:\r\n|\n|\r)/g, '')
                        .replace(/^\s+|\s+$|\s+(?=\s)/g, ''),
                    offset:
                        i === 0 && start ? n[idx] + start.startOffset : n[idx],
                }
            })

        return {
            code,
            line: start ? start.startLine + i : i,
            isEmptyLine: code.length === 1 && code[0].token === '',
        }
    })
}

function numRange(size: number, startAt: number = 0): number[] {
    return size >= 0 ? [...Array(size).keys()].map((i) => i + startAt) : []
}

const getCodeAtLine = (cl: CodeLine[], l: number): CodeLine | undefined => {
    const match = cl.find((c) => c.line === l)
    if (match) return match
    return undefined
}

const getRangeOfCodeBetweenLines = (
    cl: CodeLine[],
    startLine: number,
    anchorSize: number
): CodeLine[] => {
    return removeNulls(
        (startLine + anchorSize >= currDocLength
            ? numRange(currDocLength - startLine, startLine)
            : numRange(anchorSize, startLine)
        ).map((line: number) => getCodeAtLine(cl, line))
    )
}

// use AST for suggesting primarily

export const computeMostSimilarAnchor = (
    document: vscode.TextDocument,
    anchor: AnchorObject
): AnchorObject => {
    REANCHOR_DEBUG &&
        console.log(
            '\n\n----------- RUNNING COMPUTE MOST SIMILAR----------\n\n'
        )
    currDocLength = document.lineCount
    REANCHOR_DEBUG && console.log('original anchor', anchor)
    const sourceCode: CodeLine[] = getCodeLine(document.getText())
    REANCHOR_DEBUG && console.log('source', sourceCode)
    REANCHOR_DEBUG && console.log('anchor', anchor)
    const anchorCode: CodeLine[] = getCodeLine(anchor.anchorText, {
        startLine: anchor.anchor.startLine,
        startOffset: anchor.anchor.startOffset,
    })
    REANCHOR_DEBUG && console.log('computed anchorcode', anchorCode)
    const surroundingAbove = anchor.surroundingCode
        ? getCodeLine(anchor.surroundingCode.linesBefore.join('\n'), {
              startLine:
                  anchor.anchor.startLine - NUM_SURROUNDING_LINES >= 0
                      ? anchor.anchor.startLine - NUM_SURROUNDING_LINES
                      : 0,
              startOffset: 0,
          })
        : []
    REANCHOR_DEBUG && console.log('surroundingAbove', surroundingAbove)
    const surroundingBelow = anchor.surroundingCode
        ? getCodeLine(anchor.surroundingCode.linesAfter.join('\n'), {
              startLine: anchor.anchor.endLine,
              startOffset: 0,
          })
        : []
    REANCHOR_DEBUG && console.log('surroundingAbove', surroundingBelow)

    const newAnchors = proximitySearch(
        sourceCode,
        anchorCode,
        surroundingAbove,
        surroundingBelow,
        anchor.anchor.startLine,
        anchor.anchor.endLine,
        anchor.anchorType
    )
    if (!newAnchors.length) {
        return anchor
    }
    const projectName: string = getProjectName(document.uri.toString())
    const visiblePath: string = vscode.workspace.workspaceFolders
        ? getVisiblePath(projectName, document.uri.fsPath)
        : document.uri.fsPath

    // https://stackoverflow.com/questions/40140149/use-async-await-with-array-map
    // have to use Promise.all when returning an array of promises

    //await Promise.all(
    let newPotentialAnchors = newAnchors.map(
        (weightedAnchor: WeightedAnchor) => {
            const { weight, ...restAnchor } = weightedAnchor
            const newRange = createRangeFromObject(restAnchor.anchor)
            const potentialAnchorText = document.getText(newRange)
            const html = '' // should maybe bring back shiki but for now No
            // await getShikiCodeHighlighting(
            //     document.uri.toString(),
            //     potentialAnchorText
            // )
            const newPotentialAnchor: PotentialAnchorObject = {
                anchor: restAnchor.anchor,
                anchorText: potentialAnchorText,
                html,
                gitUrl: getGithubUrl(visiblePath, projectName, false),
                stableGitUrl: getGithubUrl(visiblePath, projectName, true),
                visiblePath,
                anchorPreview: '',
                // getFirstLineOfHtml(
                //     html,
                //     potentialAnchorText.split('\n').length === 1
                // )
                filename: document.uri.toString(),
                programmingLang: anchor.programmingLang,
                gitRepo: gitInfo[projectName].repo,
                gitBranch: gitInfo[projectName].branch,
                gitCommit: gitInfo[projectName].commit,
                anchorId: anchor.anchorId,
                originalCode: anchor.originalCode,
                parentId: anchor.parentId,
                anchored: false,
                createdTimestamp: anchor.createdTimestamp
                    ? anchor.createdTimestamp
                    : new Date().getTime(),
                priorVersions: anchor.priorVersions ? anchor.priorVersions : [],
                path: astHelper.generateCodeContextPath(newRange, document),
                surroundingCode: getSurroundingCodeArea(document, newRange),
                potentialReanchorSpots: [],
                weight,
                reasonSuggested: '',
                anchorType: getAnchorType(restAnchor.anchor, document), // can probably use this to help us reanchor too
                paoId: uuidv4(),
            }
            return newPotentialAnchor
        }
    )

    REANCHOR_DEBUG && console.log('newPotentialAnchors', newPotentialAnchors)

    newPotentialAnchors = getPotentialExpandedAnchor(
        newPotentialAnchors,
        sourceCode,
        anchorCode
    )

    REANCHOR_DEBUG && console.log('lol?', newPotentialAnchors)

    // }

    // should remove similar anchors (maybe use weight to determine similarity? or anchor locations)

    REANCHOR_DEBUG &&
        console.log('returning this from compute similar anchor', {
            ...anchor,
            potentialReanchorSpots: newPotentialAnchors.sort((a, b) =>
                b.weight < a.weight ? -1 : 1
            ),
        })
    REANCHOR_DEBUG &&
        console.log('hewwwo????', {
            ...anchor,
            potentialReanchorSpots: newPotentialAnchors,
        })

    return { ...anchor, potentialReanchorSpots: newPotentialAnchors }
}

// meat and potatoes for actually getting the anchors
const proximitySearch = (
    sourceCode: CodeLine[],
    anchorCode: CodeLine[],
    surroundingAbove: CodeLine[],
    surroundingBelow: CodeLine[],
    startLine: number,
    endLine: number,
    anchorType: AnchorType
): WeightedAnchor[] => {
    // looks at location where anchor used to be (e.g., line 269)
    const startAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            anchorCode,
            startLine,
            anchorCode.length
        )
    )

    REANCHOR_DEBUG &&
        console.log(
            'hewwo????',
            createWeightedLineComparedToSource(
                sourceCode,
                surroundingAbove,
                startLine - NUM_SURROUNDING_LINES > 0
                    ? startLine - NUM_SURROUNDING_LINES
                    : 0,
                NUM_SURROUNDING_LINES
            )
        )
    // looks at the 5 lines above anchor start line (e.g., line 264 to 269)
    const surroundingAboveAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            surroundingAbove,
            startLine - NUM_SURROUNDING_LINES >= 0
                ? startLine - NUM_SURROUNDING_LINES
                : 0,
            NUM_SURROUNDING_LINES + 1 // capture original line
        )
    )

    // looks at 5 lines below anchor (e.g., line 270 to 275)
    const surroundingBelowAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            surroundingBelow,
            endLine,
            NUM_SURROUNDING_LINES + 1 // capture original line
        )
    )

    REANCHOR_DEBUG &&
        debugPrintWeightedCodeLineStats(startAnchorSearch, anchorCode)
    REANCHOR_DEBUG &&
        surroundingAboveAnchorSearch.length &&
        debugPrintWeightedCodeLineStats(
            surroundingAboveAnchorSearch,
            surroundingAbove
        )
    REANCHOR_DEBUG &&
        surroundingBelowAnchorSearch.length &&
        debugPrintWeightedCodeLineStats(
            surroundingBelowAnchorSearch,
            surroundingBelow
        )

    // compute average similarity across three search areas
    // (original anchor locale, 5 above, 5 below)
    const averageAnchorLineWeight = startAnchorSearch.length
        ? getAverageWeight(startAnchorSearch)
        : 100
    const averageSurroundingAboveLineWeight =
        surroundingAboveAnchorSearch.length
            ? getAverageWeight(surroundingAboveAnchorSearch)
            : 100
    const averageSurroundingBelowLineWeight =
        surroundingBelowAnchorSearch.length
            ? getAverageWeight(surroundingBelowAnchorSearch)
            : 100

    let newAnchors: WeightedAnchor[] = []

    if (anchorType === AnchorType.multiline) {
        // probably can do more here
        let test = useSlidingWindowWeightedRange(anchorCode, sourceCode)
        const decent = test
            .filter((t) => t.weight < PASSABLE_SIMILARITY_THRESHOLD)
            .sort((a, b) => a.weight - b.weight)
        REANCHOR_DEBUG && console.log('TEST!!!!!!!!!!!!!!!!!!!!', decent)
        newAnchors = newAnchors.concat(
            decent.map((d) => createWeightedAnchorFromWeightedRange(d))
        )
    }
    // Nailed the location -- everything is very similar
    if (
        averageAnchorLineWeight <= HIGH_SIMILARITY_THRESHOLD &&
        averageSurroundingAboveLineWeight <= HIGH_SIMILARITY_THRESHOLD &&
        averageSurroundingBelowLineWeight <= HIGH_SIMILARITY_THRESHOLD
    ) {
        REANCHOR_DEBUG && console.log('--------- HIGH SIMILARITY ----------')
        // find anchor start and end points + anchor range
        REANCHOR_DEBUG &&
            console.log('high similarity - search space', startAnchorSearch)
        newAnchors = newAnchors.concat(
            findNewAnchorLocation(startAnchorSearch, anchorCode)
        )
        REANCHOR_DEBUG && console.log('new anchors after high', newAnchors)
    }
    // additionally search if area is just okay
    if (
        averageAnchorLineWeight <= PASSABLE_SIMILARITY_THRESHOLD &&
        averageSurroundingAboveLineWeight <= PASSABLE_SIMILARITY_THRESHOLD &&
        averageSurroundingBelowLineWeight <= PASSABLE_SIMILARITY_THRESHOLD
    ) {
        // can maybe do some additional searching to find better anchor positions (probs compare against close lines)
        REANCHOR_DEBUG && console.log('-------- MEDIUM SIMILARITY ---------')
        REANCHOR_DEBUG && console.log('medium', startAnchorSearch)
        newAnchors = newAnchors.concat(
            findNewAnchorLocation(startAnchorSearch, anchorCode)
        )
        REANCHOR_DEBUG && console.log('new anchors after medium', newAnchors)
    }
    // else { // - commenting out for testing
    REANCHOR_DEBUG && console.log('-------- LOW SIMILARITY ---------')
    REANCHOR_DEBUG &&
        console.log(
            'surroundingAboveAnchorSearch',
            surroundingAboveAnchorSearch
        )

    // then look across whole file
    newAnchors = newAnchors.concat(
        handleLowSimilarityMatch(
            anchorCode,
            sourceCode,
            surroundingAboveAnchorSearch,
            surroundingBelowAnchorSearch
        )
    )
    REANCHOR_DEBUG && console.log('new anchors after low', newAnchors)

    // sort by likelihood that this is correct anchor and return
    REANCHOR_DEBUG && console.log('returning these anchors', newAnchors)
    REANCHOR_DEBUG &&
        console.log(
            'sorted new anchors',
            newAnchors.sort((a, b) => a.weight - b.weight)
        )
    return newAnchors.sort((a, b) => a.weight - b.weight)
}

const findMostSimilarAnchorTokenInSource = (
    source: CodeToken[],
    anchor: CodeToken[],
    sourceLineNumber: number,
    anchorLineNumber: number
): WeightedToken[] => {
    // else if anchor is 1 token or less (e.g., CodeToken.length === 1)
    // -- see if token appears in source array...? (first exact match, then includes, then levenstein min...?)

    const anchorToken = anchor[0]
    const sourceWeighted: WeightedToken[] = source.map(
        (sourceToken: CodeToken, i: number) => {
            let isExactMatch = sourceToken.token === anchorToken.token
            let doesContainAnchor = sourceToken.token.includes(
                anchorToken.token
            )
            let editDistance = levenshteinDistance(
                anchorToken.token,
                sourceToken.token
            )
            let howSimilarIsTokenLocation =
                anchorToken.offset - sourceToken.offset
            const tempToken: WeightedToken =
                sourceLineNumber === anchorLineNumber
                    ? {
                          ...sourceToken,
                          editDistance,
                          doesHaveMatch: isExactMatch || doesContainAnchor,
                          isExactMatch,
                          doesContainAnchor,
                          howSimilarIsTokenOffset: howSimilarIsTokenLocation,
                          howSimilarIsTokenLine:
                              sourceLineNumber - anchorLineNumber,
                          weight: 100,
                      }
                    : {
                          ...sourceToken,
                          editDistance,
                          doesHaveMatch: isExactMatch || doesContainAnchor,
                          isExactMatch,
                          doesContainAnchor,
                          howSimilarIsTokenLine:
                              sourceLineNumber - anchorLineNumber,
                          weight: 100,
                      }
            return getWeightOfToken(tempToken)
        }
    )
    return sourceWeighted
}

// this and the function right above are nearly identical
// forgot why I needed both??
const compareSimilarityOfTokens = (
    source: CodeToken[],
    anchor: CodeToken[],
    sourceLine: number,
    anchorLine: number
): WeightedToken[] => {
    let weighted: WeightedToken[] = []
    source.forEach((token: CodeToken, index: number) => {
        let matchedToken = anchor.find((t) => t.token === token.token)
        let howManyTimesDoesTokenAppear = anchor.filter(
            (t) => t.token === token.token
        ).length
        let howSimilarIsTokenOffset = 1000
        let editDistance = 0
        if (matchedToken) {
            // - means it appeared before stored anchor token, + means after, 0 means same
            howSimilarIsTokenOffset = matchedToken.offset - token.offset
        } else {
            // if anchor includes multiple tokens, compare against the corresponding token
            // how to define corresponding? ideally would be able to locate most "similar" spot in the array of tokens
            howSimilarIsTokenOffset = anchor[0].offset - token.offset
            editDistance =
                index < anchor.length
                    ? levenshteinDistance(token.token, anchor[index].token)
                    : 1000
        }
        const tempToken: WeightedToken =
            sourceLine === anchorLine
                ? {
                      ...token,
                      howSimilarIsTokenOffset,
                      howSimilarIsTokenLine: sourceLine - anchorLine,
                      howManyTimesDoesTokenAppear,
                      editDistance,
                      doesHaveMatch: matchedToken !== undefined,
                      weight: 100,
                  }
                : {
                      ...token,
                      howSimilarIsTokenLine: sourceLine - anchorLine,
                      howManyTimesDoesTokenAppear,
                      editDistance,
                      doesHaveMatch: matchedToken !== undefined,
                      weight: 100,
                  }
        weighted.push(getWeightOfToken(tempToken))
    })

    // console.log('weighted', weighted)

    return weighted
}

const computeTokenLineSimilarityBucket = (lineDifference: number): number => {
    if (lineDifference === 0) {
        return EXACT
    } else if (lineDifference >= -3 && lineDifference <= 3) {
        return CLOSE
    } else if (
        (lineDifference < -3 && lineDifference >= -10) || // consider computing these values using proportions wrt to the file size
        (lineDifference > 3 && lineDifference <= 10)
    ) {
        return NEAR
    } else {
        return FAR
    }
}

// reversing weight since we do a subtraction for this one
const computeTokenLocationSimilarityBucket = (location: number): number => {
    if (location === 0) {
        return NEAR
    } else if (location >= -10 && location <= 10) {
        return CLOSE
    } else {
        return EXACT
    }
}

const computeEditDistanceBucket = (editDistance: number): number => {
    if (editDistance === 0) {
        return EXACT
    } else if (editDistance >= -3 && editDistance <= 3) {
        return CLOSE
    } else if (
        (editDistance < -3 && editDistance >= -10) ||
        (editDistance > 3 && editDistance <= 10)
    ) {
        return NEAR
    } else {
        return FAR
    }
}

const computeLineEditDistanceBucket = (editDistance: number): number => {
    if (editDistance === 0) {
        return EXACT
    } else if (editDistance >= -5 && editDistance <= 5) {
        return CLOSE
    } else if (
        (editDistance < -5 && editDistance >= -15) ||
        (editDistance > 5 && editDistance <= 15)
    ) {
        return NEAR
    } else {
        return FAR
    }
}

const getWeightOfToken = (token: WeightedToken): WeightedToken => {
    let total = 0
    if (token.isExactMatch) {
        total -= 0.3
    } else if (token.doesHaveMatch || token.doesContainAnchor) {
        total -= 0.2 // consider making these consts
    } // consider adding weight for if anchor includes source (e.g., anchor is 'function getBullets' and our source token is 'bullet')

    const locationOffsetBucket: number | boolean =
        typeof token.howSimilarIsTokenOffset === 'number'
            ? computeTokenLocationSimilarityBucket(
                  token.howSimilarIsTokenOffset
              )
            : false
    const locationLineBucket = computeTokenLineSimilarityBucket(
        token.howSimilarIsTokenLine
    )
    const distanceBucket =
        !token.isExactMatch && !token.doesContainAnchor
            ? computeEditDistanceBucket(token.editDistance)
            : EXACT
    total += 1 / distanceBucket
    total += 1 / locationLineBucket
    if (!(typeof locationOffsetBucket === 'boolean'))
        total -= 1 / locationOffsetBucket

    return { ...token, weight: total }
}

// may need to save at annotation/anchor creation time whether or not the anchor is sub one-line or not
// currently we only know if it's 1 line or greater
const computeLineWeight = (
    weightedLine: WeightedLine,
    typeOfAnchor: number
): number => {
    let totals: number[] = weightedLine.code.map((l: WeightedToken) => {
        return l.weight
    })

    // need a better way of handling empty lines -- maybe assign some special value that we ignore when computing weights (e.g., make weight: number | boolean and have false be the weight?)
    return totals.length ? totals.reduce((a, b) => a + b) / totals.length : 0.3 // if there are no tokens to compute weight of, that most likely means it is whitespace, in which case it should be ignored/not affect weight strongly. instead of 0, it would be nice to somehow make this have no weight at all
}

const computeLineDifferenceScore = (
    lineEditDistance: number,
    numTokenDifference: number,
    lineNumberDifference: number,
    isOneLineEmpty: boolean,
    isOnlyNonAlphaNumeric: boolean
): number => {
    let total: number = 0
    total += 1 / computeTokenLineSimilarityBucket(lineNumberDifference)
    total += 1 / computeLineEditDistanceBucket(lineEditDistance)
    total +=
        numTokenDifference > 0
            ? numTokenDifference * 0.1
            : numTokenDifference * -0.1
    total += isOneLineEmpty ? 0.2 : 0
    total += isOnlyNonAlphaNumeric ? 10 : 0 // if it's just syntactical characters and that is not what the user annotated, it's pretty much JUNK
    return total
}

const checkIfCodeIsJustNonAlphanumericCharacters = (
    code: CodeLine | WeightedLine
): boolean => {
    return !(
        code.code
            .map((t) => t.token)
            .join('')
            .match(/\W+/g)?.length === code.code.length
    )
}

const computeDifferenceBetweenLines = (
    source: CodeLine,
    anchor: CodeLine
): number => {
    const lineEditDistance = levenshteinDistance(
        source.code.join(' '),
        anchor.code.join(' ')
    )
    const numTokenDifference = source.code.length - anchor.code.length
    const lineNumberDifference = source.line - anchor.line
    const isOneLineEmpty = source.isEmptyLine || anchor.isEmptyLine
    // check if the line consists entirely of non-aphanumeric characters like "}" or ");" aka JUNK
    // but make sure that the anchor wasn't entirely non-alphanumeric characters so we aren't potentially
    // throwing away the correct anchor
    const isOnlyNonAlphaNumeric =
        source.code
            .map((t) => t.token)
            .join('')
            .match(/\W+/g)?.length === source.code.length &&
        !(
            anchor.code
                .map((t) => t.token)
                .join('')
                .match(/\W+/g)?.length === anchor.code.length
        )
    return computeLineDifferenceScore(
        lineEditDistance,
        numTokenDifference,
        lineNumberDifference,
        isOneLineEmpty,
        isOnlyNonAlphaNumeric
    )
}

const compareCodeLinesByContent = (
    source: CodeLine,
    anchor: CodeLine
): WeightedCodeLine => {
    const weighted: WeightedToken[] =
        anchor.code.length > 1
            ? compareSimilarityOfTokens(
                  source.code,
                  anchor.code,
                  source.line,
                  anchor.line
              )
            : anchor.code.length
            ? findMostSimilarAnchorTokenInSource(
                  source.code,
                  anchor.code,
                  source.line,
                  anchor.line
              )
            : // need to ensure we do not weigh empty lines -- this case should not happen
              []
    const weightAtLineLevel = computeDifferenceBetweenLines(source, anchor)
    const weightedLine: WeightedLine = { ...source, code: weighted }
    const weightedCodeLine: WeightedCodeLine = {
        codeLine: weightedLine,
        weight:
            computeLineWeight(weightedLine, anchor.code.length) *
            weightAtLineLevel,
    }
    return weightedCodeLine
}

const getComparableLines = (
    computedSourceLines: CodeLine[],
    sourceCode: CodeLine[],
    startLine: number,
    range: number
): CodeLine[] => {
    let sourceLinesToSearch = computedSourceLines
    let doesHaveContent = sourceLinesToSearch.some(
        (l) =>
            l.code.length > 1 || (l.code.length === 1 && l.code[0].token !== '')
    )
    let currStart = startLine - INCREMENT
    let currRange = range + INCREMENT * 2
    // questions
    // should it be every? or some?
    // should we also do this for comparingCode?
    // what do we do if this bool is false? seems like we should try and find the next range of source code that does have content?
    // but do we traverse up or down? or just expand both ways?
    while (
        !doesHaveContent &&
        currStart - INCREMENT >= 0 &&
        currRange + INCREMENT * 2 < currDocLength
    ) {
        sourceLinesToSearch = getRangeOfCodeBetweenLines(
            sourceCode,
            currStart,
            currRange
        )
        doesHaveContent = sourceLinesToSearch.some(
            (l) =>
                l.code.length > 1 ||
                (l.code.length === 1 && l.code[0].token !== '')
        )
        currStart = currStart - INCREMENT
        currRange = currRange + INCREMENT * 2
    }

    return sourceLinesToSearch
}

const createWeightedLineComparedToSource = (
    sourceCode: CodeLine[],
    comparingCode: CodeLine[],
    startLine: number,
    range: number
): WeightedCodeLine[] => {
    let computedSourceLines: CodeLine[] = removeNulls(
        getRangeOfCodeBetweenLines(sourceCode, startLine, range)
    )

    computedSourceLines = getComparableLines(
        computedSourceLines,
        sourceCode,
        startLine,
        range
    )

    REANCHOR_DEBUG && console.log('comparing code', comparingCode)
    REANCHOR_DEBUG && console.log('computedSourceLines', computedSourceLines)

    if (comparingCode && comparingCode.length) {
        if (comparingCode.length === computedSourceLines.length) {
            const weightedCodeLine: WeightedCodeLine[] = computedSourceLines
                .filter((l) => !l.isEmptyLine)
                .map(
                    (line, i) =>
                        line &&
                        compareCodeLinesByContent(line, comparingCode[i])
                )

            return weightedCodeLine
        } else if (computedSourceLines.length > comparingCode.length) {
            if (comparingCode.length === 1) {
                const weightedCodeLine: WeightedCodeLine[] = computedSourceLines
                    .filter((l) => !l.isEmptyLine)
                    .map(
                        (line) =>
                            line &&
                            compareCodeLinesByContent(line, comparingCode[0]) // consider adding in rest of line for singletoken anchors to help compute overall line similarity
                    )

                return weightedCodeLine
            } else {
                let weightedCodeLines: WeightedCodeLine[] = []
                weightedCodeLines = useSlidingWindow(
                    comparingCode,
                    computedSourceLines
                )
                return weightedCodeLines
            }
        } else {
            return useSlidingWindow(comparingCode, computedSourceLines)
        }
    }

    REANCHOR_DEBUG && console.error('Could not compute weight')
    return []
}

const debugPrintWeightedCodeLineStats = (
    wcl: WeightedCodeLine[],
    comparator: CodeLine[]
): void => {
    console.log('--------BEGIN DEBUG---------')
    console.log('Lines', wcl)
    console.log('Comparing Against', comparator)
    const weights = wcl.map((l) => l.weight)
    console.log(
        'Average Similarity',
        weights.reduce((a, b) => a + b) / wcl.length
    )
    const bestLine = wcl.find((l) => l.weight === Math.min(...weights))
    console.log('Most Similar Line', bestLine)
    if (comparator.length === 1 && bestLine) {
        console.log('ONE LINE COMPARATOR')
        const tokenWeights = bestLine.codeLine.code.map(
            (c: WeightedToken) => c.weight
        )
        console.log(
            'Most similar token',
            bestLine.codeLine.code.find(
                (cl: WeightedToken) => cl.weight === Math.min(...tokenWeights)
            )
        )
    }
}

// ensure if we are reusing tokens, we don't carry over their weight from the last
// token they were compared to
const resetTokens = (tokens: WeightedToken[]): CodeToken[] => {
    return tokens.map((t) => {
        return { token: t.token, offset: t.offset }
    })
}

const makeCodeLineFromWeightedCodeLine = (
    weightedCodeLine: WeightedCodeLine
): CodeLine => {
    return {
        code: resetTokens(weightedCodeLine.codeLine.code),
        line: weightedCodeLine.codeLine.line,
        isEmptyLine:
            weightedCodeLine.codeLine.code.length === 1 &&
            weightedCodeLine.codeLine.code[0].token === '',
    }
}

// little worried that this may perform poorly when line arrays are similar but are just off by one
// may make more sense to find best match compared to first line then iterate from that point (e.g., ok line 1 matches line 5, lets see if line 2 matches line 6, etc.)
const useSlidingWindow = (
    windowVal: CodeLine[],
    source: CodeLine[]
): WeightedCodeLine[] => {
    let weightedCodeLine: WeightedCodeLine[] = []
    const weightableSource = source.filter((l) => !l.isEmptyLine)
    const weightableWindowVal = windowVal.filter((l) => !l.isEmptyLine)
    for (let i = 0; i < weightableSource.length; i++) {
        const iRange = numRange(weightableWindowVal.length, i)
        iRange[iRange.length - 1] < weightableSource.length - 1 &&
            iRange.forEach((j, idx) => {
                weightedCodeLine = weightedCodeLine.concat(
                    compareCodeLinesByContent(
                        weightableSource[j],
                        weightableWindowVal[idx]
                    )
                )
            })
    }
    return weightedCodeLine
}

const useSlidingWindowWeightedRange = (
    windowVal: CodeLine[],
    source: CodeLine[]
): WeightedCodeLineRange[] => {
    let weightedCodeLine: WeightedCodeLineRange[] = []
    const weightableSource = source.filter((l) => !l.isEmptyLine)
    const weightableWindowVal = windowVal.filter((l) => !l.isEmptyLine)
    for (
        let i = 0;
        i < weightableSource.length - weightableWindowVal.length;
        i++
    ) {
        let weightedRange: WeightedCodeLineRange = {
            codeLines: [],
            startLine: weightableSource[i].line,
            endLine:
                i + weightableWindowVal.length < weightableSource.length
                    ? weightableSource[i + weightableWindowVal.length].line
                    : weightableSource[weightableSource.length - 1].line,
            weight: 100,
        }
        const iRange = numRange(weightableWindowVal.length, i)
        iRange[iRange.length - 1] < weightableSource.length - 1 &&
            iRange.forEach((j, idx) => {
                weightedRange.codeLines.push(
                    compareCodeLinesByContent(
                        weightableSource[j],
                        weightableWindowVal[idx]
                    )
                )
            })
        const weights = weightedRange.codeLines.map((l) => l.weight)
        weightedRange.weight = weights.reduce((a, b) => a + b) / weights.length
        weightedCodeLine.push(weightedRange)
    }
    return weightedCodeLine
}

const getAverageWeight = (wcl: WeightedCodeLine[]): number => {
    const lineWeights = wcl.map((l) => l.weight)
    return lineWeights.reduce((a, b) => a + b) / lineWeights.length
}

const handleLowSimilarityMatch = (
    anchorCode: CodeLine[],
    sourceCode: CodeLine[],
    surroundingAboveAnchorSearch: WeightedCodeLine[],
    surroundingBelowAnchorSearch: WeightedCodeLine[]
): WeightedAnchor[] => {
    let newAnchors: WeightedAnchor[] = []
    // compare anchor to surrounding context (i.e., see if it just moved up or down 5 lines)
    const weightedAboveComparedToAnchor: WeightedCodeLine[] = useSlidingWindow(
        anchorCode,
        surroundingAboveAnchorSearch.map((wcl) =>
            makeCodeLineFromWeightedCodeLine(wcl)
        )
    )

    const weightedBelowComparedToAnchor: WeightedCodeLine[] = useSlidingWindow(
        anchorCode,
        surroundingBelowAnchorSearch.map((wcl) =>
            makeCodeLineFromWeightedCodeLine(wcl)
        )
    )

    REANCHOR_DEBUG &&
        console.log(
            'maybe in area above anchor?',
            weightedAboveComparedToAnchor
        )
    REANCHOR_DEBUG &&
        console.log(
            'maybe in area below anchor?',
            weightedBelowComparedToAnchor
        )
    const areaSearch: WeightedCodeLine[] = weightedAboveComparedToAnchor.concat(
        weightedBelowComparedToAnchor
    )
    // see if any of those close area anchors are good
    const goodMatches = areaSearch.filter(
        (l) => l.weight <= PASSABLE_SIMILARITY_THRESHOLD
    )

    REANCHOR_DEBUG && console.log('goodmatches', goodMatches)

    // compare against whole file
    // (tbd if we should just always do this or only if goodMatches returns [])
    const weightedWholeSourceComparedToAnchor: WeightedCodeLine[] =
        useSlidingWindow(anchorCode, sourceCode)
    const goodSourceMatches = weightedWholeSourceComparedToAnchor
        .filter((l) => l.weight <= PASSABLE_SIMILARITY_THRESHOLD)
        .concat(goodMatches)
        .sort((a, b) => a.weight - b.weight)
    REANCHOR_DEBUG && console.log('goodSourceMatches', goodSourceMatches)
    if (goodSourceMatches.length) {
        // make sure we're not suggesting a whole bunch of things
        const anchorsToSuggest =
            goodSourceMatches.length > 10
                ? goodSourceMatches.slice(0, 10)
                : goodSourceMatches
        // pair down even more to only unique suggestions
        const auditedAnchorsToSuggest: WeightedCodeLine[] = arrayUniqueByKey(
            suggestionAudit(anchorsToSuggest),
            'line'
        )
        if (!auditedAnchorsToSuggest.length) {
            // we only had junk suggestions :-(
            return []
        }
        REANCHOR_DEBUG && console.log('audited', auditedAnchorsToSuggest)
        // add anchors -- this will favor the best match in the array
        newAnchors.push(
            findNewAnchorLocation(auditedAnchorsToSuggest, anchorCode)
        )
        const otherAnchorsToSuggest = auditedAnchorsToSuggest.filter((a, i) =>
            i === 0 ? false : a.weight - auditedAnchorsToSuggest[0].weight < 0.1
        )

        // if there are other similarly good matches, add them too
        if (otherAnchorsToSuggest.length) {
            newAnchors = newAnchors.concat(
                otherAnchorsToSuggest.map((a) =>
                    makeAnchorFromWeightedCodeLine(a)
                )
            )
        }
        REANCHOR_DEBUG && console.log('compared to whole source', newAnchors)
    } else {
        REANCHOR_DEBUG && console.log('nothing')
        // in theory, this is where we should compare against other files...
        newAnchors = []
    }

    return newAnchors.sort((a, b) => a.weight - b.weight)
}

// would be better to not have garbage recommendations but that's LIFE!!!!!!!!
// makes sure the array isn't empty (not even sure why we're getting empty arrays in the first place..)
// and ensures that the suggestion isn't just a syntactical character like "}"
const suggestionAudit = (
    wcls: WeightedCodeLine[]
): AuditedWeightedCodeLine[] => {
    return wcls
        .filter((wcl) => {
            return (
                wcl.codeLine.code.length &&
                checkIfCodeIsJustNonAlphanumericCharacters(wcl.codeLine)
            )
        })
        .map((wcl) => {
            return { ...wcl, line: wcl.codeLine.line }
        })
}

// interface SourceToken extends CodeToken {
//     line: number
// }

const handleLineTies = (wcls: WeightedCodeLine[]): WeightedCodeLine => {
    const closerToAnchor = wcls.sort(
        (a, b) =>
            Math.abs(a.codeLine.code[0].howSimilarIsTokenLine) -
            Math.abs(b.codeLine.code[0].howSimilarIsTokenLine)
    )

    // if(closerToAnchor.length > 0) {
    //     const minToken = findMin(wcls)
    // } -- find which line has the token with the lowest weight
    // other things for tie breaking - which lines have the most matches?
    return closerToAnchor[0]
}

const handleTokenTies = (wts: WeightedToken[]): WeightedToken => {
    const closer = wts.sort(
        (a, b) =>
            Math.abs(a.howSimilarIsTokenLine) -
            Math.abs(b.howSimilarIsTokenLine)
    )

    return closer[0]
}

const createWeightedAnchorFromWeightedRange = (
    wcr: WeightedCodeLineRange
): WeightedAnchor => {
    const weightedAnchor: WeightedAnchor = {
        anchor: {
            startLine: wcr.startLine,
            startOffset: wcr.codeLines[0].codeLine.code[0].offset,
            endLine: wcr.endLine,
            endOffset:
                wcr.codeLines[wcr.codeLines.length - 1].codeLine.code[
                    wcr.codeLines[wcr.codeLines.length - 1].codeLine.code
                        .length - 1
                ].offset,
        },
        weight: wcr.weight,
        reasonSuggested: 'multi-line',
    }
    return weightedAnchor
}

const findNewAnchorLocation = (
    sourceCode: WeightedCodeLine[],
    anchorCode: CodeLine[]
): WeightedAnchor => {
    // console.log('anchorCode?', anchorCode)
    const startToken = anchorCode[0].code[0]
    const endToken =
        anchorCode[anchorCode.length - 1].code[
            anchorCode[anchorCode.length - 1].code.length - 1
        ]
    let newAnchor: WeightedAnchor = {
        anchor: {
            startLine: 0,
            startOffset: 0,
            endLine: 0,
            endOffset: 0,
        },
        weight: 100,
        reasonSuggested: '',
    }

    REANCHOR_DEBUG &&
        console.log(
            'anchorCode',
            anchorCode,
            'sourcecode',
            sourceCode,
            'start',
            startToken,
            'end',
            endToken
        )

    // single token anchor
    if (startToken && endToken && objectsEqual(startToken, endToken)) {
        // this should be the main case
        if (sourceCode.length === 1) {
            newAnchor = findSingleTokenAnchor(sourceCode, startToken)
        }
        // need to search across multiple lines for our token
        else {
            const bestLine: WeightedCodeLine = handleLineTies(
                findMin(sourceCode)
            )
            newAnchor = findSingleTokenAnchor([bestLine], startToken)
        }
    }
    // single line anchor
    else {
        newAnchor = findMultiLineAnchor(sourceCode, anchorCode)
    }
    return newAnchor
}

const findMin = (array: any[]): any[] => {
    const weights = array.map((c) => c.weight)
    const min = array.filter((t) => t.weight === Math.min(...weights))
    return min
}

const stupidFindMin = (array: any[]): any => {
    const weights = array.map((c) => c.weight * c.lineWeight)
    const min = array.find(
        (t) => t.weight * t.lineWeight === Math.min(...weights)
    )
    return min
}

const makeAnchorFromWeightedCodeLine = (
    startWcl: WeightedCodeLine,
    endWcl?: WeightedCodeLine,
    startMatch?: WeightedToken,
    endMatch?: WeightedToken
): WeightedAnchor => {
    const startToken = startMatch ? startMatch : startWcl.codeLine.code[0]
    const endToken = endMatch
        ? endMatch
        : endWcl
        ? endWcl.codeLine.code[endWcl.codeLine.code.length - 1]
        : startWcl.codeLine.code[startWcl.codeLine.code.length - 1]
    return {
        anchor: {
            startLine: startWcl.codeLine.line,
            endLine: endWcl ? endWcl.codeLine.line : startWcl.codeLine.line,
            startOffset: startToken.offset,
            endOffset: endToken.offset + endToken.token.length,
        },
        weight: endWcl ? startWcl.weight + endWcl.weight / 2 : startWcl.weight,
        reasonSuggested: '',
    }
}

const findSingleTokenAnchor = (
    sourceCode: WeightedCodeLine[],
    startToken: CodeToken
): WeightedAnchor => {
    let newAnchor: WeightedAnchor = {
        anchor: { startLine: 0, endLine: 0, startOffset: 0, endOffset: 0 },
        weight: 100,
        reasonSuggested: '',
    }
    const potentialMatches = sourceCode[0].codeLine.code.filter(
        (l) => l.doesHaveMatch || l.isExactMatch || l.doesContainAnchor
    )

    const match =
        // we have multiple matches
        potentialMatches.length > 1
            ? // handle ties and get best match
              handleTokenTies(findMin(potentialMatches))
            : // else we have one match
            potentialMatches.length
            ? // use one match
              potentialMatches[0]
            : // else use whatever we have in the source... not ideal
              handleTokenTies(findMin(sourceCode[0].codeLine.code))
    newAnchor = makeAnchorFromWeightedCodeLine(sourceCode[0], undefined, match)
    return newAnchor
}

const moveForwardThroughCodeLine = (
    lastLine: number,
    lastOffset: number,
    code: CodeLine[]
): IteratedCodeToken => {
    //
    const lines = code.map((l) => l.line)
    const lineAtLastLine = getCodeAtLine(code, lastLine)
    const lineIdx = lines.indexOf(lastLine)
    if (lineAtLastLine) {
        const offsets = lineAtLastLine.code.map((t) => t.offset)
        const indexOfLastOffset = offsets.indexOf(lastOffset)
        if (indexOfLastOffset !== -1) {
            return indexOfLastOffset < offsets.length - 1
                ? {
                      ...lineAtLastLine.code[indexOfLastOffset + 1],
                      line: lastLine,
                      idxOfLine: lineIdx,
                      idxOfToken: indexOfLastOffset + 1,
                  }
                : lineIdx < lines.length - 1 && lineIdx !== -1
                ? {
                      ...code[lineIdx + 1].code[0],
                      idxOfLine: lineIdx + 1,
                      line: lines[lineIdx + 1],
                      idxOfToken: 0,
                  }
                : {
                      ...code[0].code[0],
                      idxOfLine: 0,
                      line: lines[0],
                      idxOfToken: 0,
                  } // wrap back around -- maybe not ideal
        }
        // if can't find index - go to next line?
        else {
            return lineIdx !== -1 && lineIdx < lines.length - 1
                ? {
                      ...code[lineIdx + 1].code[0],
                      line: lines[lineIdx + 1],
                      idxOfLine: lineIdx + 1,
                      idxOfToken: 0,
                  }
                : {
                      ...code[0].code[0],
                      idxOfLine: 0,
                      line: lines[0],
                      idxOfToken: 0,
                  }
        }
    } else {
        return {
            ...code[0].code[0],
            idxOfLine: 0,
            line: lines[0],
            idxOfToken: 0,
        }
    }
}

const getLinesWithContent = (code: CodeLine[]): CodeLine[] => {
    return code.filter((c) => c.code.length)
}

const moveBackwardsThroughCodeLine = (
    lastLine: number,
    lastOffset: number,
    code: CodeLine[]
): IteratedCodeToken => {
    //
    let codeToEvaluate = getLinesWithContent(code)
    const lines = codeToEvaluate.map((l) => l.line)
    const lineAtLastLine = getCodeAtLine(codeToEvaluate, lastLine)
    const lineIdx = lines.indexOf(lastLine)
    if (lineAtLastLine) {
        const offsets = lineAtLastLine.code.map((t) => t.offset)
        const indexOfLastOffset = offsets.indexOf(lastOffset)
        if (indexOfLastOffset !== -1) {
            return indexOfLastOffset > 0
                ? {
                      ...lineAtLastLine.code[indexOfLastOffset - 1],
                      line: lastLine,
                      idxOfLine: lineIdx,
                      idxOfToken: indexOfLastOffset - 1,
                  }
                : lineIdx > 0 && lineIdx !== -1
                ? {
                      ...codeToEvaluate[lineIdx - 1].code[
                          codeToEvaluate[lineIdx - 1].code.length - 1
                      ],
                      idxOfLine: lineIdx - 1,
                      line: lines[lineIdx - 1],
                      idxOfToken: codeToEvaluate[lineIdx - 1].code.length - 1,
                  }
                : {
                      ...codeToEvaluate[0].code[0],
                      idxOfLine: 0,
                      line: lines[0],
                      idxOfToken: 0,
                  } // wrap back around -- maybe not ideal
        }
        // if can't find index - go to next line?
        else {
            return lineIdx !== -1 && lineIdx > 0
                ? {
                      ...codeToEvaluate[lineIdx - 1].code[
                          codeToEvaluate[lineIdx - 1].code.length - 1
                      ],
                      idxOfLine: lineIdx - 1,
                      line: lines[lineIdx - 1],
                      idxOfToken: codeToEvaluate[lineIdx - 1].code.length - 1,
                  }
                : {
                      ...codeToEvaluate[0].code[0],
                      idxOfLine: 0,
                      line: lines[0],
                      idxOfToken: 0,
                  }
        }
    } else {
        return {
            ...codeToEvaluate[0].code[0],
            idxOfLine: 0,
            line: lines[0],
            idxOfToken: 0,
        }
    }
}

const isIteratedCodeToken = (token: any): token is IteratedCodeToken => {
    return token.hasOwnProperty('idxOfToken')
}

const findMultiLineAnchor = (
    sourceCode: WeightedCodeLine[],
    anchorCode: CodeLine[]
): WeightedAnchor => {
    let startLineIdx = 0
    let endLineIdx = anchorCode.length - 1
    let startTokenIdx = 0
    let endTokenIdx = anchorCode[anchorCode.length - 1].code.length - 1
    let newAnchor: WeightedAnchor = {
        anchor: { startLine: 0, startOffset: 0, endLine: 0, endOffset: 0 },
        weight: 100,
        reasonSuggested: '',
    }

    // may need to use these iterators if we only have bad matches for first/last token due to edit
    // that removed those tokens from source
    // e.g., could increment startTokenIdx to look and see if second token appears even tho first was removed

    let startToken: CodeToken | IteratedCodeToken =
        anchorCode[startLineIdx].code[startTokenIdx]
    while (!startToken) {
        startToken = moveForwardThroughCodeLine(
            anchorCode[startLineIdx].line,
            startTokenIdx,
            anchorCode
        )
        if (isIteratedCodeToken(startToken)) {
            startLineIdx = startToken.idxOfLine
            startTokenIdx = startToken.idxOfToken
        } else {
            break
        }
    }
    let endToken = anchorCode[endLineIdx].code[endTokenIdx]
    while (!endToken) {
        endToken = moveBackwardsThroughCodeLine(
            anchorCode[endLineIdx].line,
            endTokenIdx,
            anchorCode
        )
        if (isIteratedCodeToken(endToken)) {
            endLineIdx = endToken.idxOfLine
            endTokenIdx = endToken.idxOfToken
        } else {
            break
        }
    }

    REANCHOR_DEBUG &&
        console.log('start token', startToken, 'endToken', endToken)

    let startTokenMatches: WeightedToken[] = []
    let endTokenMatches: WeightedToken[] = []
    REANCHOR_DEBUG && console.log('what?', sourceCode)
    sourceCode.forEach((l) => {
        REANCHOR_DEBUG && console.log(' l.codeLine.line', l.codeLine.line)
        REANCHOR_DEBUG &&
            console.log(
                'uh-startline',
                anchorCode[startLineIdx],
                'endline',
                anchorCode[endLineIdx]
            )
        const startMatchWeights = l.codeLine.code.flatMap((c) => {
            return {
                ...compareTwoTokens(
                    c,
                    startToken,
                    l.codeLine.line,
                    anchorCode[startLineIdx].line
                ),
                line: l.codeLine.line,
                lineWeight: computeDifferenceBetweenLines(
                    makeCodeLineFromWeightedCodeLine(l),
                    anchorCode[startLineIdx]
                ),
            }
        })
        const endMatchWeights = l.codeLine.code.flatMap((c) => {
            return {
                ...compareTwoTokens(
                    c,
                    endToken,
                    l.codeLine.line,
                    anchorCode[endLineIdx].line
                ),
                line: l.codeLine.line,
                lineWeight: computeDifferenceBetweenLines(
                    makeCodeLineFromWeightedCodeLine(l),
                    anchorCode[endLineIdx]
                ),
            }
        })
        startTokenMatches = startTokenMatches.concat(...startMatchWeights)
        endTokenMatches = endTokenMatches.concat(...endMatchWeights)
    })

    const bestMatchStart: WeightedTokenLine = stupidFindMin(startTokenMatches)
    REANCHOR_DEBUG && console.log('bestmatchstart', bestMatchStart)
    const bestMatchEnd: WeightedTokenLine = stupidFindMin(endTokenMatches)
    REANCHOR_DEBUG && console.log('bestMatchEnd', bestMatchEnd)
    newAnchor.anchor.startLine = bestMatchStart.line
    newAnchor.anchor.startOffset = bestMatchStart.offset
    newAnchor.anchor.endLine = bestMatchEnd.line
    newAnchor.anchor.endOffset = bestMatchEnd.offset + bestMatchEnd.token.length
    newAnchor.weight = bestMatchStart.weight + bestMatchEnd.weight / 2
    return newAnchor
}

const compareTwoTokens = (
    tokenA: CodeToken,
    tokenB: CodeToken,
    tokenALine: number,
    tokenBLine: number
): WeightedToken => {
    let howSimilarIsTokenOffset = 1000
    let howSimilarIsTokenLine = tokenALine - tokenBLine
    let editDistance = 0

    // - means it appeared before stored anchor token, + means after, 0 means same
    howSimilarIsTokenOffset = tokenA.offset - tokenB.offset

    // if anchor includes multiple tokens, compare against the corresponding token
    // how to define corresponding? ideally would be able to locate most "similar" spot in the array of tokens
    editDistance = levenshteinDistance(tokenA.token, tokenB.token)

    const tempToken: WeightedToken =
        tokenALine === tokenBLine
            ? {
                  ...tokenA,
                  doesContainAnchor: tokenA.token.includes(tokenB.token),
                  isExactMatch: tokenA.token === tokenB.token,
                  howSimilarIsTokenOffset,
                  howSimilarIsTokenLine,
                  editDistance,
                  doesHaveMatch:
                      tokenA.token === tokenB.token ||
                      tokenA.token.includes(tokenB.token),
                  weight: 100,
              }
            : {
                  ...tokenA,
                  doesContainAnchor: tokenA.token.includes(tokenB.token),
                  isExactMatch: tokenA.token === tokenB.token,
                  howSimilarIsTokenLine,
                  editDistance,
                  doesHaveMatch:
                      tokenA.token === tokenB.token ||
                      tokenA.token.includes(tokenB.token),
                  weight: 100,
              }
    return getWeightOfToken(tempToken)
}

// code: CodeToken[] | WeightedToken[]
// line: number
// isEmptyLine: boolean

const flattenCodeLine = (lines: CodeLine[]): CodeLine => {
    let flattenedLine: CodeLine = {
        ...lines[0],
        code: lines[0].code.map((t) => {
            return { ...t, line: lines[0].line }
        }),
    }
    lines.forEach((cl, i) => {
        if (i !== 0) {
            const newCode = cl.code.map((t) => {
                return { ...t, line: cl.line }
            })
            flattenedLine.code = [...flattenedLine.code, ...newCode]
        }
    })
    flattenedLine = {
        ...flattenedLine,
        code: flattenedLine.code.filter((c) => c.token !== ''),
    }
    return flattenedLine
}

const getPotentialExpandedAnchor = (
    newPotentialAnchors: PotentialAnchorObject[],
    sourceCode: CodeLine[],
    anchorCode: CodeLine[]
) => {
    let bestAnchor = newPotentialAnchors[0]
    const anchorCopy: Anchor = { ...bestAnchor.anchor }
    // see if bestanchor is a substring of original anchor

    const lines = getRangeOfCodeBetweenLines(
        sourceCode,
        bestAnchor.anchor.startLine,
        currDocLength - bestAnchor.anchor.startLine
    )

    //  these mostly just make sense for multi-line anchors
    if (checkIfJoiningLinesMakesAnchor(lines, anchorCode)) {
        const flatCopyAnchor = flattenCodeLine(anchorCode)
        const flatCopySource = flattenCodeLine(lines)
        const idx = flatCopyAnchor.code.length
        const tokens = flatCopySource.code.slice(0, idx)
        if (
            // every token is same but the lines/offsets are different
            !flatCopyAnchor.code.every((t, i) => {
                return objectsEqual(t, tokens[i])
            })
        ) {
            const expandedAnchor = makeAnchorFromTokens(tokens, idx, anchorCopy)
            bestAnchor = {
                ...bestAnchor,
                anchor: expandedAnchor,
            }
            newPotentialAnchors.splice(0, 1, bestAnchor) // hate mutating an array in place but wahtever
        }
    } else if (
        checkIfAnchorJustHadStuffPutInTheMiddleSomewhere(lines, anchorCode)
    ) {
        const flatCopyAnchor = flattenCodeLine(anchorCode)
        const flatCopySource = flattenCodeLine(lines)
        const justAnchorTokens = flatCopyAnchor.code.map((t) => t.token)
        const justSourceTokens = flatCopySource.code.map((t) => t.token)
        const idx =
            justSourceTokens.lastIndexOf(
                justAnchorTokens[justAnchorTokens.length - 1]
            ) + 1 // lastIndex is not inclusive
        const tokens = flatCopySource.code.slice(0, idx)
        const expandedAnchor = makeAnchorFromTokens(tokens, idx, anchorCopy)
        bestAnchor = {
            ...bestAnchor,
            anchor: expandedAnchor,
        }
        newPotentialAnchors.splice(0, 1, bestAnchor)
    }
    return newPotentialAnchors
}

const checkIfJoiningLinesMakesAnchor = (
    source: CodeLine[],
    anchor: CodeLine[]
): boolean => {
    const flattenedSourceLine = flattenCodeLine(source)
    const flattenedAnchorLine = flattenCodeLine(anchor)
    return flattenedAnchorLine.code.every(
        (c, i) => c.token === flattenedSourceLine.code[i].token
    )
}

// bad name!
const checkIfAnchorJustHadStuffPutInTheMiddleSomewhere = (
    source: CodeLine[],
    anchor: CodeLine[]
): boolean => {
    const justSourceTokens = flattenCodeLine(source).code.map((t) => t.token)
    const justAnchorTokens = flattenCodeLine(anchor).code.map((t) => t.token)
    return justAnchorTokens.every((t) => justSourceTokens.includes(t))
}

const makeAnchorFromTokens = (
    tokens: CodeToken[],
    len: number,
    backup: Anchor
): Anchor => {
    return {
        startLine: tokens[0].line ? tokens[0].line : backup.startLine,
        startOffset: tokens[0].offset,
        endLine: tokens[len - 1].line
            ? (tokens[len - 1].line as number) // stupid hack because VS Code is being a bitch -- our ternary should ensure that it is not undefined (which is the only other possible value)
            : backup.endLine,
        endOffset: tokens[len - 1].offset + tokens[len - 1].token.length,
    }
}

// maybe had this for re-factoring??
// const findTokenMatch = (tokens: WeightedToken[]): WeightedToken => {
//     const potentialMatches = tokens.filter(
//         (l) => l.doesHaveMatch || l.isExactMatch || l.doesContainAnchor
//     )
//     if (potentialMatches.length === 1) {
//         return potentialMatches[0]
//     } else {
//         const match = handleTokenTies(findMin(potentialMatches))
//         if (match) {
//             return match
//         } else {
//             return potentialMatches[0]
//         }
//     }
// }
