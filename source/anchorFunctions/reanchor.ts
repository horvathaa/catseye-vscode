import * as vscode from 'vscode'
import {
    Anchor,
    AnchorObject,
    NUM_SURROUNDING_LINES,
    PotentialAnchorObject,
    HIGH_SIMILARITY_THRESHOLD, // we are pretty confident the anchor is here
    PASSABLE_SIMILARITY_THRESHOLD, // we are confident enough
    INCREMENT, // amount for expanding search range
} from '../constants/constants'
import { astHelper, gitInfo } from '../extension'
import {
    arrayUniqueByKey,
    getFirstLineOfHtml,
    getGithubUrl,
    getProjectName,
    getShikiCodeHighlighting,
    getVisiblePath,
    levenshteinDistance,
    objectsEqual,
    removeNulls,
} from '../utils/utils'
import {
    createRangeFromObject,
    getSurroundingLinesAfterAnchor,
    getSurroundingLinesBeforeAnchor,
} from './anchor'

// toggle to true for more console messages
export const REANCHOR_DEBUG: boolean = false
let currDocLength = 0

interface CodeToken {
    token: string
    offset: number
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

interface AuditedWeightedCodeLine extends WeightedCodeLine {
    line: number
}
interface WeightedTokenLine extends WeightedToken {
    line: number
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
const getCodeLine = (text: string, start?: StartPosition): CodeLine[] => {
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

        // console.log('n', n)
        return {
            code,
            line: start ? start.startLine + i : i,
            isEmptyLine: code.length === 1 && code[0].token === '',
        }
    })
}

function numRange(size: number, startAt: number = 0): number[] {
    return [...Array(size).keys()].map((i) => i + startAt)
}

const getCodeAtLine = (cl: CodeLine[], l: number): CodeLine | undefined => {
    const match = cl.find((c) => c.line === l)
    if (match) return match
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

const findAtOriginalLocation = (
    sourceCode: CodeLine[],
    anchorCode: CodeLine[]
): boolean => {
    return (
        Math.max(
            ...anchorCode.map((a, i) => {
                let distance = Infinity
                const cl = getCodeAtLine(sourceCode, a.line)
                if (cl) {
                    // distance = levenshteinDistance(a.code[0].token, cl.code)
                }
                return distance
            })
        ) === 0
    )
}

// use AST for suggesting primarily

export const computeMostSimilarAnchor = (
    document: vscode.TextDocument,
    anchor: AnchorObject
): AnchorObject => {
    currDocLength = document.lineCount
    const sourceCode: CodeLine[] = getCodeLine(document.getText())
    REANCHOR_DEBUG && console.log('source', sourceCode)
    REANCHOR_DEBUG && console.log('anchor', anchor)
    const anchorCode: CodeLine[] = getCodeLine(anchor.anchorText, {
        startLine: anchor.anchor.startLine,
        startOffset: anchor.anchor.startOffset,
    })
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
    console.log('sourceCode', sourceCode)
    console.log('anchorCode', anchorCode)
    console.log('surroundingAbove', surroundingAbove)
    console.log('surroundingBelow', surroundingBelow)
    // if (findAtOriginalLocation(sourceCode, anchorCode)) {
    //     console.log('wowza')
    // }
    const newAnchors = proximitySearch(
        sourceCode,
        anchorCode,
        surroundingAbove,
        surroundingBelow,
        anchor.anchor.startLine,
        anchor.anchor.endLine
    )
    const projectName: string = getProjectName(document.uri.toString())
    const visiblePath: string = vscode.workspace.workspaceFolders
        ? getVisiblePath(projectName, document.uri.fsPath)
        : document.uri.fsPath

    // https://stackoverflow.com/questions/40140149/use-async-await-with-array-map
    // have to use Promise.all when returning an array of promises

    //await Promise.all(
    const newPotentialAnchors = newAnchors.map(
        (weightedAnchor: WeightedAnchor) => {
            const { weight, ...restAnchor } = weightedAnchor
            const newRange = createRangeFromObject(restAnchor.anchor)
            const potentialAnchorText = document.getText(newRange)
            const html = '' // should maybe bring back shiki but for now No
            // await getShikiCodeHighlighting(
            //     document.uri.toString(),
            //     potentialAnchorText
            // )
            console.log('anchor in newanchors map', anchor)
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
                surroundingCode: {
                    linesBefore: getSurroundingLinesBeforeAnchor(
                        document,
                        newRange
                    ),
                    linesAfter: getSurroundingLinesAfterAnchor(
                        document,
                        newRange
                    ),
                },
                potentialReanchorSpots: [],
                weight,
                reasonSuggested: '',
            }
            return newPotentialAnchor
        }
    )

    // should remove similar anchors (maybe use weight to determine similarity? or anchor locations)

    REANCHOR_DEBUG &&
        console.log('returning this from compute similar anchor', {
            ...anchor,
            potentialReanchorSpots: newPotentialAnchors.sort((a, b) =>
                b.weight < a.weight ? -1 : 1
            ),
        })
    // )

    // console.log('newAnchors', newAnchors)

    return { ...anchor, potentialReanchorSpots: newPotentialAnchors }
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
    // console.log('anchorToken', anchorToken)
    const sourceWeighted: WeightedToken[] = source.map(
        (sourceToken: CodeToken, i: number) => {
            // console.log('sourceToken', sourceToken)
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

const compareSimilarityOfTokens = (
    source: CodeToken[],
    anchor: CodeToken[],
    sourceLine: number,
    anchorLine: number
): WeightedToken[] => {
    // make some token similarity interface or somethin gidkkkkkk
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

const EXACT = 10
const CLOSE = 4
const NEAR = 3
const FAR = 2

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
    }
    // else if(l.howManyTimesDoesTokenAppear) {
    //     total -= l.howManyTimesDoesTokenAppear
    // }
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
    // console.log(
    //     'source in comput line diff',
    //     source,
    //     'anchor in comput line diff',
    //     anchor,
    //     'regex',
    //     source.code
    //         .map((t) => t.token)
    //         .join('')
    //         .match(/\W+/g)
    // )
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
    // console.log('source', source, 'anchor', anchor)
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
              [
                  // also need to consider whether weighting
                  // empty arrays like this is Good or not
                  //   {
                  //       token: '',
                  //       weight: 0.5, // ?????? ideally this is a sort of mid-point weight
                  //       howSimilarIsTokenLocation: 0,
                  //       howManyTimesDoesTokenAppear: 0,
                  //       doesHaveMatch: false,
                  //       editDistance: 0,
                  //       offset: 0,
                  //   },
              ]
    const weightAtLineLevel = computeDifferenceBetweenLines(source, anchor)
    // console.log('weightAtLineLevel', weightAtLineLevel)
    const weightedLine: WeightedLine = { ...source, code: weighted }
    // console.log('weightedLine', weightedLine)
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
    console.log(
        'computedSourceLines',
        computedSourceLines,
        'startLine',
        startLine,
        'comparing',
        comparingCode
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
        // console.log('computedSourceLines', computedSourceLines)
        if (comparingCode.length === computedSourceLines.length) {
            console.log('in comparing code.length = computedsourcelines.length')
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
                console.log('in comparing code.length = 1')
                const weightedCodeLine: WeightedCodeLine[] = computedSourceLines
                    .filter((l) => !l.isEmptyLine)
                    .map(
                        (line) =>
                            line &&
                            compareCodeLinesByContent(line, comparingCode[0]) // consider adding in rest of line for singletoken anchors to help compute overall line similarity
                    )

                return weightedCodeLine
            } else {
                console.log('in computedsourcelines.length greater than')
                let weightedCodeLines: WeightedCodeLine[] = []
                for (
                    let i = 0;
                    i <
                    Math.floor(
                        computedSourceLines.length / comparingCode.length
                    );
                    i += comparingCode.length
                ) {
                    const iRange = numRange(comparingCode.length, i)
                    iRange.forEach((j, idx) => {
                        weightedCodeLines = weightedCodeLines.concat(
                            compareCodeLinesByContent(
                                sourceCode[j],
                                comparingCode[idx]
                            )
                        )
                    })
                }
                return weightedCodeLines
            }
        } else {
            //
            console.log('in else')
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
    console.log('BEGIN DEBUG')
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

const isWeightedCodeLine = (
    line: CodeLine | WeightedCodeLine
): line is WeightedCodeLine => {
    return (line as WeightedCodeLine).codeLine !== undefined
}

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
    for (
        let i = 0;
        i < Math.floor(weightableSource.length / weightableWindowVal.length);
        i += weightableWindowVal.length
    ) {
        const iRange = numRange(weightableWindowVal.length, i)
        iRange.forEach((j, idx) => {
            let sourceLine: CodeLine
            weightedCodeLine = weightedCodeLine.concat(
                // !source[j].isEmptyLine && !windowVal[idx].isEmptyLine
                // ?

                compareCodeLinesByContent(
                    weightableSource[j],
                    weightableWindowVal[idx]
                )
                // : []
            )
        })
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
    const weightedAboveComparedToAnchor: WeightedCodeLine[] = useSlidingWindow(
        anchorCode,
        surroundingAboveAnchorSearch.map((wcl) =>
            makeCodeLineFromWeightedCodeLine(wcl)
        )
    )
    console.log('weightedAboveCOmparedToAnchor', weightedAboveComparedToAnchor)

    const weightedBelowComparedToAnchor: WeightedCodeLine[] = useSlidingWindow(
        anchorCode,
        surroundingBelowAnchorSearch.map((wcl) =>
            makeCodeLineFromWeightedCodeLine(wcl)
        )
    )
    console.log('weightedBelowComparedToAnchor', weightedBelowComparedToAnchor)
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
    // TODO: actually use these values i.e., finish this
    const areaSearch: WeightedCodeLine[] = weightedAboveComparedToAnchor.concat(
        weightedBelowComparedToAnchor
    )
    const goodMatches = areaSearch.filter(
        (l) => l.weight <= PASSABLE_SIMILARITY_THRESHOLD
    )
    console.log('goodMatches', goodMatches)
    // if (goodMatches.length) {
    //     // const bestLine: WeightedCodeLine = findMin(goodMatches)
    //     newAnchors.push(findNewAnchorLocation(goodMatches, anchorCode))
    //     REANCHOR_DEBUG &&
    //         console.log('new anchors compared to surrounding', newAnchors)
    // } else {
    // whole file search -- this stuff can def be refactored
    const weightedWholeSourceComparedToAnchor: WeightedCodeLine[] =
        useSlidingWindow(anchorCode, sourceCode)
    const goodSourceMatches = weightedWholeSourceComparedToAnchor
        .filter((l) => l.weight <= PASSABLE_SIMILARITY_THRESHOLD)
        .concat(goodMatches)
        .sort((a, b) => a.weight - b.weight)
    console.log('pwease', goodSourceMatches)
    if (goodSourceMatches.length) {
        // const bestLine: WeightedCodeLine = findMin(goodMatches)
        const anchorsToSuggest =
            goodSourceMatches.length > 10
                ? goodSourceMatches.slice(0, 10)
                : goodSourceMatches
        console.log('hewwo???', suggestionAudit(anchorsToSuggest))
        const auditedAnchorsToSuggest: WeightedCodeLine[] = arrayUniqueByKey(
            suggestionAudit(anchorsToSuggest),
            'line'
        )
        console.log('audited post', auditedAnchorsToSuggest)
        newAnchors.push(
            findNewAnchorLocation(auditedAnchorsToSuggest, anchorCode)
        )
        REANCHOR_DEBUG && console.log('compared to whole source', newAnchors)
    } else {
        REANCHOR_DEBUG && console.log('nothing')
        newAnchors = []
    }
    //}

    return newAnchors.sort((a, b) => a.weight - b.weight)
}

// would be better to not have garbage recommendations but that's LIFE!!!!!!!!
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

const proximitySearch = (
    sourceCode: CodeLine[],
    anchorCode: CodeLine[],
    surroundingAbove: CodeLine[],
    surroundingBelow: CodeLine[],
    startLine: number,
    endLine: number
): WeightedAnchor[] => {
    const startAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            anchorCode,
            startLine,
            anchorCode.length
        )
    )
    console.log('startAnchorSearch', startAnchorSearch)
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
    console.log('surroundingAboveAnchorSearch', surroundingAboveAnchorSearch)
    const surroundingBelowAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            surroundingBelow,
            endLine,
            NUM_SURROUNDING_LINES + 1 // capture original line
        )
    )
    // console.log('startAnchorSearch', startAnchorSearch)
    // console.log('surroundingAboveAnchorSearch', surroundingAboveAnchorSearch)
    console.log('surroundingBelowAnchorSearch', surroundingBelowAnchorSearch)

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
    // console.log('ahsdiaosdho')

    let newAnchors: WeightedAnchor[] = []
    // Nailed the location
    if (
        averageAnchorLineWeight <= HIGH_SIMILARITY_THRESHOLD &&
        averageSurroundingAboveLineWeight <= HIGH_SIMILARITY_THRESHOLD &&
        averageSurroundingBelowLineWeight <= HIGH_SIMILARITY_THRESHOLD
    ) {
        REANCHOR_DEBUG && console.log('--------- HIGH SIMILARITY ----------')
        // find anchor start and end points + anchor range
        console.log('GOOD LOCATION')
        newAnchors = newAnchors.concat(
            findNewAnchorLocation(startAnchorSearch, anchorCode)
        )
    }
    if (
        averageAnchorLineWeight <= PASSABLE_SIMILARITY_THRESHOLD &&
        averageSurroundingAboveLineWeight <= PASSABLE_SIMILARITY_THRESHOLD &&
        averageSurroundingBelowLineWeight <= PASSABLE_SIMILARITY_THRESHOLD
    ) {
        // can maybe do some additional searching to find better anchor positions (probs compare against close lines)
        REANCHOR_DEBUG && console.log('-------- MEDIUM SIMILARITY ---------')
        console.log('MEH LOCATION')
        newAnchors = newAnchors.concat(
            findNewAnchorLocation(startAnchorSearch, anchorCode)
        )
    }
    // else { // - commenting out for testing
    REANCHOR_DEBUG && console.log('-------- LOW SIMILARITY ---------')
    REANCHOR_DEBUG &&
        console.log(
            'surroundingAboveAnchorSearch',
            surroundingAboveAnchorSearch
        )
    newAnchors = newAnchors.concat(
        handleLowSimilarityMatch(
            anchorCode,
            sourceCode,
            surroundingAboveAnchorSearch,
            surroundingBelowAnchorSearch
        )
    )

    // }
    // see if anchor is actually in surrounding context
    // if not - full doc
    // if STILL not - mark as unknown + look at AST to try and find appropriate potential matches
    // }

    // generated an anchor

    // do the lines above and below seems similar?

    // --> if starting point is good
    // (i.e., we have >= threshold amount of matching content in
    // anchor lines, above lines, below lines)
    //  !! We are in the correct Anchor LINE Range !!
    // --> --> look at weights to find most promising start and end anchor points
    // --> --> I.E., we are now looking at tokens to find best starting and ending points

    // --> if starting point is not good
    // (i.e., we are < threshold amount of matching content in
    // anchor lines, above lines, below lines)
    // !! We are NOT in the correct Anchor LINE Range !!
    // Determine if our anchor is actually matching against the +/- 5 lines
    // that originally would've housed our surrounding context (i.e., compare saved anchor to
    // what we grabbed in +/- 5 lines )
    // --> if we are STILL not good
    // Widen our window to... +/- additional 5 lines and see if they seem to have our anchor line
    // IF NOT --> full doc search for best candidate location OR try and use AST to minimize search space
    REANCHOR_DEBUG && console.log('returning these anchors', newAnchors)
    console.log('new babies', newAnchors)
    return newAnchors
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
    console.log('startToken', startToken)
    console.log('endToken', endToken)
    console.log('soourceCode', sourceCode)
    // single token anchor
    if (objectsEqual(startToken, endToken)) {
        // this should be the main case
        if (sourceCode.length === 1) {
            console.log('what???')
            newAnchor = findSingleTokenAnchor(sourceCode, startToken)
        }
        // need to search across multiple lines for our token
        else {
            const bestLine: WeightedCodeLine = handleLineTies(
                findMin(sourceCode)
            )
            console.log('bestLine', bestLine)
            newAnchor = findSingleTokenAnchor([bestLine], startToken)
        }
    }
    // single line anchor
    else {
        console.log('multiline???')
        newAnchor = findMultiLineAnchor(sourceCode, anchorCode)
    }
    console.log('returning this', newAnchor)
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
    if (potentialMatches.length === 1) {
        const match = potentialMatches[0]
        if (match.isExactMatch) {
            newAnchor = makeAnchorFromWeightedCodeLine(
                sourceCode[0],
                undefined,
                match
            )
            // newAnchor.anchor.startLine = sourceCode[0].codeLine.line
            // newAnchor.anchor.endLine = sourceCode[0].codeLine.line
            // newAnchor.anchor.startOffset = match.offset
            // newAnchor.anchor.endOffset = match.offset + match.token.length
            // newAnchor.weight = match.weight
            // console.log('cool', newAnchor)
            return newAnchor
        } else if (match.doesContainAnchor || match.doesHaveMatch) {
            // newAnchor.anchor.startLine = sourceCode[0].codeLine.line
            // newAnchor.anchor.endLine = sourceCode[0].codeLine.line
            // newAnchor.anchor.startOffset =
            //     match.offset + match.token.indexOf(startToken.token)
            // newAnchor.anchor.endOffset =
            //     match.offset +
            //     match.token.indexOf(startToken.token) +
            //     startToken.token.length
            // newAnchor.weight = match.weight
            newAnchor = makeAnchorFromWeightedCodeLine(
                sourceCode[0],
                undefined,
                match
            )
            // console.log('also cool', newAnchor)
            return newAnchor
        }
    } else if (potentialMatches.length > 1) {
        // console.log('potentialMatches', potentialMatches)
        const match = handleTokenTies(findMin(potentialMatches))
        // const weights = potentialMatches.map((t) => t.weight)
        // const match = potentialMatches.find(
        //     (t) => t.weight === Math.min(...weights)
        // )
        if (match) {
            if (match.isExactMatch) {
                newAnchor.anchor.startLine = sourceCode[0].codeLine.line
                newAnchor.anchor.endLine = sourceCode[0].codeLine.line
                newAnchor.anchor.startOffset = match.offset
                newAnchor.anchor.endOffset = match.offset + match.token.length
                newAnchor.weight = match.weight
                // console.log('cool - multi match', newAnchor)
                return newAnchor
            } else if (match.doesContainAnchor || match.doesHaveMatch) {
                newAnchor.anchor.startLine = sourceCode[0].codeLine.line
                newAnchor.anchor.endLine = sourceCode[0].codeLine.line
                newAnchor.anchor.startOffset =
                    match.offset + match.token.indexOf(startToken.token)
                newAnchor.anchor.endOffset =
                    match.offset +
                    match.token.indexOf(startToken.token) +
                    startToken.token.length
                newAnchor.weight = match.weight
                // console.log('also cool - multi match', newAnchor) // in case of single character "e", this currently matches on substring of console, would be better if it matched on variable e - should prefer that option due to edit distance...?
                return newAnchor
            } else {
                // console.log('uh oh')
                newAnchor.anchor.startLine = sourceCode[0].codeLine.line
                newAnchor.anchor.endLine = sourceCode[0].codeLine.line
                newAnchor.anchor.startOffset = match.offset
                newAnchor.anchor.endOffset = match.offset + match.token.length
                // console.log('BAD MATCH', newAnchor)
                newAnchor.weight = match.weight
                return newAnchor
            }
        }
    }
    // none of the anchor points either match or contain our token (not great)
    // i.e. potentialMatches.length === 0
    else {
        REANCHOR_DEBUG && console.log('WARNING - potentially bad anchor')
        // const weights = sourceCode[0].codeLine.code.map((c) => c.weight)
        // const minWeightToken = sourceCode[0].codeLine.code.find(
        //     (t) => t.weight === Math.min(...weights)
        // )
        const minWeightToken: WeightedToken = handleTokenTies(
            findMin(sourceCode[0].codeLine.code)
        )
        if (minWeightToken) {
            newAnchor.anchor.startLine = sourceCode[0].codeLine.line
            newAnchor.anchor.endLine = sourceCode[0].codeLine.line
            newAnchor.anchor.startOffset = minWeightToken.offset
            newAnchor.anchor.endOffset =
                minWeightToken.offset + minWeightToken.token.length
            // console.log('BAD MATCH', newAnchor)
            newAnchor.weight = minWeightToken.weight
            return newAnchor
        } else {
            // should have something here
        }
    }
    return newAnchor
}

// need to implement at some point - should be a combo of looking at weighted tokens to see whether we found matches
// plus need info about how similar surrounding lines of code were
// and when we add path stuff, can include that
// may make sense to build this string over time as opposed to doing it
// only once we find a match
// const getReasonSuggested = (weightedTokens: WeightedToken[]) : string => {
//     let reason = ""
//     const rationales = weightedTokens.map((t) => {

//     })
// }

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

    const startToken = anchorCode[startLineIdx].code[startTokenIdx]
    const endToken = anchorCode[endLineIdx].code[endTokenIdx]

    let startTokenMatches: WeightedToken[] = []
    let endTokenMatches: WeightedToken[] = []
    // console.log('sourceCode', sourceCode)
    sourceCode.forEach((l) => {
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
        // console.log('startMatchWeights', startMatchWeights)
        // console.log('endMatchWeights', endMatchWeights)
        startTokenMatches = startTokenMatches.concat(...startMatchWeights)
        endTokenMatches = endTokenMatches.concat(...endMatchWeights)
    })
    console.log('startTokenMatches', startTokenMatches)
    console.log('endTokenMatches', endTokenMatches)
    const bestMatchStart: WeightedTokenLine = stupidFindMin(startTokenMatches)
    const bestMatchEnd: WeightedTokenLine = stupidFindMin(endTokenMatches)
    // console.log('new start', bestMatchStart)
    // console.log('new end', bestMatchEnd)

    newAnchor.anchor.startLine = bestMatchStart.line
    newAnchor.anchor.startOffset = bestMatchStart.offset
    newAnchor.anchor.endLine = bestMatchEnd.line
    newAnchor.anchor.endOffset = bestMatchEnd.offset + bestMatchEnd.token.length
    newAnchor.weight = bestMatchStart.weight + bestMatchEnd.weight / 2
    return newAnchor
}

const findTokenMatch = (tokens: WeightedToken[]): WeightedToken => {
    const potentialMatches = tokens.filter(
        (l) => l.doesHaveMatch || l.isExactMatch || l.doesContainAnchor
    )
    if (potentialMatches.length === 1) {
        return potentialMatches[0]
    } else {
        const match = handleTokenTies(findMin(potentialMatches))
        if (match) {
            return match
        } else {
            return potentialMatches[0]
        }
    }
}

const compareTwoTokens = (
    tokenA: CodeToken,
    tokenB: CodeToken,
    tokenALine: number,
    tokenBLine: number
): WeightedToken => {
    // let matchedToken = anchor.find((t) => t.token === token.token)
    // let howManyTimesDoesTokenAppear = anchor.filter(
    //     (t) => t.token === token.token
    // ).length

    console.log(
        'tokenA',
        tokenA,
        'tokenB',
        tokenB,
        'tokenALine',
        tokenALine,
        'tokenBLine',
        tokenBLine
    )
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
