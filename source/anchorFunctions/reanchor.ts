import * as vscode from 'vscode'
import {
    Anchor,
    AnchorObject,
    NUM_SURROUNDING_LINES,
} from '../constants/constants'
import { levenshteinDistance, objectsEqual, removeNulls } from '../utils/utils'

let currDocLength = 0

const HIGH_SIMILARITY_THRESHOLD = 0.3 // we are pretty confident the anchor is here
const PASSABLE_SIMILARITY_THRESHOLD = 0.7 // we are confident enough

interface CodeToken {
    token: string
    offset: number
}
interface CodeLine {
    code: CodeToken[] | WeightedToken[]
    line: number
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

interface WeightedToken extends CodeToken {
    howManyTimesDoesTokenAppear?: number
    howSimilarIsTokenLocation: number
    editDistance: number
    doesHaveMatch: boolean
    doesContainAnchor?: boolean // use if less token or less anchor
    isExactMatch?: boolean
    weight: number
    // mostSimilarTokenOnLine: CodeToken
    // mostSimilarTokenInSearchScope: CodeToken
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

        // console.log('n', n)
        return {
            code: t
                .split(' ')
                .filter((c) => c.length)
                .map((c, idx) => {
                    return {
                        token: c
                            .replace(/(?:\r\n|\n|\r)/g, '')
                            .replace(/^\s+|\s+$|\s+(?=\s)/g, ''),
                        offset:
                            i === 0 && start
                                ? n[idx] + start.startOffset
                                : n[idx],
                    }
                }),
            line: start ? start.startLine + i : i,
        }
    })
}

function range(size: number, startAt: number = 0): number[] {
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
            ? range(currDocLength - startLine, startLine)
            : range(anchorSize, startLine)
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
    console.log('anchor', anchor)
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
    const surroundingBelow = anchor.surroundingCode
        ? getCodeLine(anchor.surroundingCode.linesAfter.join('\n'), {
              startLine: anchor.anchor.endLine,
              startOffset: 0,
          })
        : []
    console.log('sourceCode', sourceCode)
    console.log('anchorCode', anchorCode)
    console.log('surroundingAbove', surroundingAbove)
    console.log('surroundingBelow', surroundingBelow)
    // if (findAtOriginalLocation(sourceCode, anchorCode)) {
    //     console.log('wowza')
    // }
    proximitySearch(
        sourceCode,
        anchorCode,
        surroundingAbove,
        surroundingBelow,
        anchor.anchor.startLine,
        anchor.anchor.endLine
    )

    return anchor
}

const findMostSimilarAnchorTokenInSource = (
    source: CodeToken[],
    anchor: CodeToken[]
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
            const tempToken = {
                ...sourceToken,
                editDistance,
                doesHaveMatch: isExactMatch || doesContainAnchor,
                isExactMatch,
                doesContainAnchor,
                howSimilarIsTokenLocation,
                weight: 100,
            }
            return getWeightOfToken(tempToken)
        }
    )
    return sourceWeighted
}

const compareSimilarityOfTokens = (
    source: CodeToken[],
    anchor: CodeToken[]
): WeightedToken[] => {
    // make some token similarity interface or somethin gidkkkkkk
    let weighted: WeightedToken[] = []
    source.forEach((token: CodeToken, index: number) => {
        let matchedToken = anchor.find((t) => t.token === token.token)
        let howManyTimesDoesTokenAppear = anchor.filter(
            (t) => t.token === token.token
        ).length
        let howSimilarIsTokenLocation = 1000
        let editDistance = 0
        if (matchedToken) {
            // - means it appeared before stored anchor token, + means after, 0 means same
            howSimilarIsTokenLocation = matchedToken.offset - token.offset
        } else {
            // if anchor includes multiple tokens, compare against the corresponding token
            // how to define corresponding? ideally would be able to locate most "similar" spot in the array of tokens

            editDistance =
                index < anchor.length
                    ? levenshteinDistance(token.token, anchor[index].token)
                    : 1000
        }
        const tempToken = {
            ...token,
            howSimilarIsTokenLocation,
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

const computeTokenLocationSimilarityBucket = (location: number): number => {
    if (location === 0) {
        return EXACT
    } else if (location >= -10 && location <= 10) {
        return CLOSE
    } else if (
        (location < -10 && location >= -20) ||
        (location > 10 && location <= 20)
    ) {
        return NEAR
    } else {
        return FAR
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

const getWeightOfToken = (token: WeightedToken): WeightedToken => {
    let total = 0
    if (token.isExactMatch) {
        total -= 0.3
    } else if (token.doesHaveMatch || token.doesContainAnchor) {
        total -= 0.2
    }
    // else if(l.howManyTimesDoesTokenAppear) {
    //     total -= l.howManyTimesDoesTokenAppear
    // }
    const locationBucket = computeTokenLocationSimilarityBucket(
        token.howSimilarIsTokenLocation
    )
    const distanceBucket =
        !token.isExactMatch && !token.doesContainAnchor
            ? computeEditDistanceBucket(token.editDistance)
            : EXACT
    total += 1 / distanceBucket
    total += 1 / locationBucket

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

    return totals.reduce((a, b) => a + b) / totals.length
}

const compareCodeLinesByContent = (
    source: CodeLine,
    anchor: CodeLine
): WeightedCodeLine => {
    const weighted: WeightedToken[] =
        anchor.code.length > 1
            ? compareSimilarityOfTokens(source.code, anchor.code)
            : findMostSimilarAnchorTokenInSource(source.code, anchor.code)
    const weightedLine: WeightedLine = { ...source, code: weighted }
    const weightedCodeLine: WeightedCodeLine = {
        codeLine: weightedLine,
        weight: computeLineWeight(weightedLine, anchor.code.length),
    }
    return weightedCodeLine
}

const createWeightedLineComparedToSource = (
    sourceCode: CodeLine[],
    comparingCode: CodeLine[],
    startLine: number,
    range: number
): WeightedCodeLine[] => {
    const computedSourceLines: CodeLine[] = removeNulls(
        getRangeOfCodeBetweenLines(sourceCode, startLine, range)
    )

    if (comparingCode && comparingCode.length) {
        const weightedCodeLine: WeightedCodeLine[] = computedSourceLines.map(
            (line, i) =>
                line && compareCodeLinesByContent(line, comparingCode[i])
        )

        return weightedCodeLine
    }

    console.error('Could not compute weight')
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
    console.log(
        'Most Similar Line',
        wcl.find((l) => l.weight === Math.min(...weights))
    )
    if (comparator.length === 1) {
        console.log('ONE LINE COMPARATOR')
        const tokenWeights = wcl[0].codeLine.code.map(
            (c: WeightedToken) => c.weight
        )
        console.log(
            'Most similar token',
            wcl[0].codeLine.code.find(
                (cl: WeightedToken) => cl.weight === Math.min(...tokenWeights)
            )
        )
    }
}

const proximitySearch = (
    sourceCode: CodeLine[],
    anchorCode: CodeLine[],
    surroundingAbove: CodeLine[],
    surroundingBelow: CodeLine[],
    startLine: number,
    endLine: number
): WeightedCodeLine[] => {
    const startAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            anchorCode,
            startLine,
            anchorCode.length
        )
    )
    const surroundingAboveAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            surroundingAbove,
            startLine - NUM_SURROUNDING_LINES >= 0
                ? startLine - NUM_SURROUNDING_LINES
                : 0,
            NUM_SURROUNDING_LINES
        )
    )
    const surroundingBelowAnchorSearch: WeightedCodeLine[] = removeNulls(
        createWeightedLineComparedToSource(
            sourceCode,
            surroundingBelow,
            endLine,
            NUM_SURROUNDING_LINES
        )
    )
    // console.log('startAnchorSearch', startAnchorSearch)
    // console.log('surroundingAboveAnchorSearch', surroundingAboveAnchorSearch)
    // console.log('surroundingBelowAnchorSearch', surroundingBelowAnchorSearch)

    debugPrintWeightedCodeLineStats(startAnchorSearch, anchorCode)
    surroundingAboveAnchorSearch.length &&
        debugPrintWeightedCodeLineStats(
            surroundingAboveAnchorSearch,
            surroundingAbove
        )
    surroundingBelowAnchorSearch.length &&
        debugPrintWeightedCodeLineStats(
            surroundingBelowAnchorSearch,
            surroundingBelow
        )

    const anchorLineWeights = startAnchorSearch.map((l) => l.weight)
    const averageAnchorLineWeight =
        anchorLineWeights.reduce((a, b) => a + b) / anchorLineWeights.length
    // console.log('ahsdiaosdho')
    const surroundingAboveLineWeights = surroundingAboveAnchorSearch.length
        ? surroundingAboveAnchorSearch.map((l) => l.weight)
        : []

    const averageSurroundingAboveLineWeight =
        surroundingAboveAnchorSearch.length
            ? surroundingAboveLineWeights.reduce((a, b) => a + b) /
              surroundingAboveLineWeights.length
            : 0

    const surroundingBelowLineWeights = surroundingBelowAnchorSearch.length
        ? surroundingBelowAnchorSearch.map((l) => l.weight)
        : []

    const averageSurroundingBelowLineWeight =
        surroundingBelowAnchorSearch.length
            ? surroundingBelowLineWeights.reduce((a, b) => a + b) /
              surroundingBelowLineWeights.length
            : 0

    let newAnchor
    // Nailed the location
    if (
        averageAnchorLineWeight <= HIGH_SIMILARITY_THRESHOLD &&
        averageSurroundingAboveLineWeight <= HIGH_SIMILARITY_THRESHOLD &&
        averageSurroundingBelowLineWeight <= HIGH_SIMILARITY_THRESHOLD
    ) {
        console.log('--------- HIGH SIMILARITY ----------')
        // find anchor start and end points + anchor range
        newAnchor = findNewAnchorLocation(startAnchorSearch, anchorCode)
    } else if (
        averageAnchorLineWeight <= PASSABLE_SIMILARITY_THRESHOLD &&
        averageSurroundingAboveLineWeight <= PASSABLE_SIMILARITY_THRESHOLD &&
        averageSurroundingBelowLineWeight <= PASSABLE_SIMILARITY_THRESHOLD
    ) {
        // can maybe do some additional searching to find better anchor positions (probs compare against close lines)
        console.log('-------- MEDIUM SIMILARITY ---------')
        newAnchor = findNewAnchorLocation(startAnchorSearch, anchorCode)
    } else {
        console.log('-------- LOW SIMILARITY ---------')
        const weightedAboveComparedToAnchor: (false | WeightedCodeLine)[] =
            surroundingAbove.map(
                (line, i) =>
                    line &&
                    i < anchorCode.length &&
                    compareCodeLinesByContent(line, anchorCode[i])
            )

        const weightedBelowComparedToAnchor: (false | WeightedCodeLine)[] =
            surroundingBelow.map(
                (line, i) =>
                    line &&
                    i < anchorCode.length &&
                    compareCodeLinesByContent(line, anchorCode[i])
            )
        console.log(
            'maybe in area above anchor?',
            weightedAboveComparedToAnchor
        )
        console.log(
            'maybe in area below anchor?',
            weightedBelowComparedToAnchor
        )
        // see if anchor is actually in surrounding context
        // if not - widen window
        // if still not - full doc
        // if STILL not - mark as unknown + look at AST to try and find appropriate potential matches
    }

    if (newAnchor) {
    }
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

    return []
}

// interface SourceToken extends CodeToken {
//     line: number
// }

const findNewAnchorLocation = (
    sourceCode: WeightedCodeLine[],
    anchorCode: CodeLine[]
): Anchor => {
    const startToken = anchorCode[0].code[0]
    const endToken =
        anchorCode[anchorCode.length - 1].code[
            anchorCode[anchorCode.length - 1].code.length - 1
        ]
    let newAnchor: Anchor = {
        startLine: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 0,
    }
    console.log('startToken', startToken)
    console.log('endToken', endToken)
    // single token anchor
    if (objectsEqual(startToken, endToken)) {
        // this should be the main case
        if (sourceCode.length === 1) {
            newAnchor = findSingleTokenAnchor(sourceCode, startToken)
        }
        // need to search across multiple lines for our token
        else {
            const bestLine: WeightedCodeLine = findMin(sourceCode)
            console.log('bestLine????', bestLine)
            newAnchor = findSingleTokenAnchor([bestLine], startToken)
        }
    }
    // single line anchor
    else {
        newAnchor = findMultiLineAnchor(sourceCode, anchorCode)
    }
    return newAnchor
}

const findMin = (array: any[]): any => {
    const weights = array.map((c) => c.weight)
    const min = array.find((t) => t.weight === Math.min(...weights))
    return min
}

const findSingleTokenAnchor = (
    sourceCode: WeightedCodeLine[],
    startToken: CodeToken
): Anchor => {
    let newAnchor: Anchor = {
        startLine: 0,
        endLine: 0,
        startOffset: 0,
        endOffset: 0,
    }
    const potentialMatches = sourceCode[0].codeLine.code.filter(
        (l) => l.doesHaveMatch || l.isExactMatch || l.doesContainAnchor
    )
    if (potentialMatches.length === 1) {
        const match = potentialMatches[0]
        if (match.isExactMatch) {
            newAnchor.startLine = sourceCode[0].codeLine.line
            newAnchor.endLine = sourceCode[0].codeLine.line
            newAnchor.startOffset = match.offset
            newAnchor.endOffset = match.offset + match.token.length
            console.log('cool', newAnchor)
            return newAnchor
        } else if (match.doesContainAnchor || match.doesHaveMatch) {
            newAnchor.startLine = sourceCode[0].codeLine.line
            newAnchor.endLine = sourceCode[0].codeLine.line
            newAnchor.startOffset =
                match.offset + match.token.indexOf(startToken.token)
            newAnchor.endOffset =
                match.offset +
                match.token.indexOf(startToken.token) +
                startToken.token.length
            console.log('also cool', newAnchor)
            return newAnchor
        }
    } else if (potentialMatches.length > 1) {
        console.log('potentialMatches', potentialMatches)
        const match = findMin(potentialMatches)
        // const weights = potentialMatches.map((t) => t.weight)
        // const match = potentialMatches.find(
        //     (t) => t.weight === Math.min(...weights)
        // )
        if (match) {
            if (match.isExactMatch) {
                newAnchor.startLine = sourceCode[0].codeLine.line
                newAnchor.endLine = sourceCode[0].codeLine.line
                newAnchor.startOffset = match.offset
                newAnchor.endOffset = match.offset + match.token.length
                console.log('cool - multi match', newAnchor)
                return newAnchor
            } else if (match.doesContainAnchor || match.doesHaveMatch) {
                newAnchor.startLine = sourceCode[0].codeLine.line
                newAnchor.endLine = sourceCode[0].codeLine.line
                newAnchor.startOffset =
                    match.offset + match.token.indexOf(startToken.token)
                newAnchor.endOffset =
                    match.offset +
                    match.token.indexOf(startToken.token) +
                    startToken.token.length
                console.log('also cool - multi match', newAnchor) // in case of single character "e", this currently matches on substring of console, would be better if it matched on variable e - should prefer that option due to edit distance...?
                return newAnchor
            } else {
                console.log('uh oh')
                newAnchor.startLine = sourceCode[0].codeLine.line
                newAnchor.endLine = sourceCode[0].codeLine.line
                newAnchor.startOffset = match.offset
                newAnchor.endOffset = match.offset + match.token.length
                console.log('BAD MATCH', newAnchor)
                return newAnchor
            }
        }
    }
    // none of the anchor points either match or contain our token (not great)
    // i.e. potentialMatches.length === 0
    else {
        console.log('WARNING - potentially bad anchor')
        // const weights = sourceCode[0].codeLine.code.map((c) => c.weight)
        // const minWeightToken = sourceCode[0].codeLine.code.find(
        //     (t) => t.weight === Math.min(...weights)
        // )
        const minWeightToken = findMin(sourceCode[0].codeLine.code)
        if (minWeightToken) {
            newAnchor.startLine = sourceCode[0].codeLine.line
            newAnchor.endLine = sourceCode[0].codeLine.line
            newAnchor.startOffset = minWeightToken.offset
            newAnchor.endOffset =
                minWeightToken.offset + minWeightToken.token.length
            console.log('BAD MATCH', newAnchor)
            return newAnchor
        } else {
            // should have something here
        }
    }
    return newAnchor
}

interface WeightedTokenLine extends WeightedToken {
    line: number
}

const findMultiLineAnchor = (
    sourceCode: WeightedCodeLine[],
    anchorCode: CodeLine[]
): Anchor => {
    let startLineIdx = 0
    let endLineIdx = anchorCode.length - 1
    let startTokenIdx = 0
    let endTokenIdx = anchorCode[anchorCode.length - 1].code.length - 1
    let newAnchor = { startLine: 0, startOffset: 0, endLine: 0, endOffset: 0 }

    // may need to use these iterators if we only have bad matches for first/last token due to edit
    // that removed those tokens from source
    // e.g., could increment startTokenIdx to look and see if second token appears even tho first was removed

    const startToken = anchorCode[startLineIdx].code[startTokenIdx]
    const endToken = anchorCode[endLineIdx].code[endTokenIdx]

    let startTokenMatches: WeightedToken[] = []
    let endTokenMatches: WeightedToken[] = []
    sourceCode.forEach((l) => {
        const startMatchWeights = l.codeLine.code.flatMap((c) => {
            return { ...compareTwoTokens(c, startToken), line: l.codeLine.line }
        })
        const endMatchWeights = l.codeLine.code.flatMap((c) => {
            return { ...compareTwoTokens(c, endToken), line: l.codeLine.line }
        })
        // console.log('startMatchWeights', startMatchWeights)
        // console.log('endMatchWeights', endMatchWeights)
        startTokenMatches = startTokenMatches.concat(...startMatchWeights)
        endTokenMatches = endTokenMatches.concat(...endMatchWeights)
    })
    const bestMatchStart: WeightedTokenLine = findMin(startTokenMatches)
    const bestMatchEnd: WeightedTokenLine = findMin(endTokenMatches)
    console.log('new start', bestMatchStart)
    console.log('new end', bestMatchEnd)

    newAnchor.startLine = bestMatchStart.line
    newAnchor.startOffset = bestMatchStart.offset
    newAnchor.endLine = bestMatchEnd.line
    newAnchor.endOffset = bestMatchEnd.offset + bestMatchEnd.token.length
    return newAnchor
}

const findTokenMatch = (tokens: WeightedToken[]): WeightedToken => {
    const potentialMatches = tokens.filter(
        (l) => l.doesHaveMatch || l.isExactMatch || l.doesContainAnchor
    )
    if (potentialMatches.length === 1) {
        return potentialMatches[0]
    } else {
        const match = findMin(potentialMatches)
        if (match) {
            return match
        } else {
            return potentialMatches[0]
        }
    }
}

const compareTwoTokens = (
    tokenA: CodeToken,
    tokenB: CodeToken
): WeightedToken => {
    // let matchedToken = anchor.find((t) => t.token === token.token)
    // let howManyTimesDoesTokenAppear = anchor.filter(
    //     (t) => t.token === token.token
    // ).length
    let howSimilarIsTokenLocation = 1000
    let editDistance = 0

    // - means it appeared before stored anchor token, + means after, 0 means same
    howSimilarIsTokenLocation = tokenA.offset - tokenB.offset

    // if anchor includes multiple tokens, compare against the corresponding token
    // how to define corresponding? ideally would be able to locate most "similar" spot in the array of tokens

    editDistance = levenshteinDistance(tokenA.token, tokenB.token)

    const tempToken = {
        ...tokenA,
        doesContainAnchor: tokenA.token.includes(tokenB.token),
        isExactMatch: tokenA.token === tokenB.token,
        howSimilarIsTokenLocation,
        editDistance,
        doesHaveMatch:
            tokenA.token === tokenB.token ||
            tokenA.token.includes(tokenB.token),
        weight: 100,
    }
    return getWeightOfToken(tempToken)
}
