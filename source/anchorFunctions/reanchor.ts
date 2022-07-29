import * as vscode from 'vscode'
import { AnchorObject } from '../constants/constants'
import { levenshteinDistance } from '../utils/utils'
import { editorBackground } from '../view/app/styles/vscodeStyles'

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
    codeLine: CodeLine | WeightedLine
    weight: number
}

interface WeightedToken extends CodeToken {
    howManyTimesDoesTokenAppear?: number
    howSimilarIsTokenLocation: number
    editDistance: number
    doesHaveMatch: boolean
    doesContainAnchor?: boolean // use if less token or less anchor
    isExactMatch?: boolean
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
): (CodeLine | undefined)[] => {
    return range(anchorSize, startLine).map((line: number) =>
        getCodeAtLine(cl, line)
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
    const sourceCode: CodeLine[] = getCodeLine(document.getText())
    console.log('anchor', anchor)
    const anchorCode: CodeLine[] = getCodeLine(anchor.anchorText, {
        startLine: anchor.anchor.startLine,
        startOffset: anchor.anchor.startOffset,
    })
    console.log('sourceCode', sourceCode)
    console.log('anchorCode', anchorCode)
    // if (findAtOriginalLocation(sourceCode, anchorCode)) {
    //     console.log('wowza')
    // }
    proximitySearch(
        sourceCode,
        anchorCode,
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
            return {
                ...sourceToken,
                editDistance,
                doesHaveMatch: isExactMatch || doesContainAnchor,
                isExactMatch,
                doesContainAnchor,
                howSimilarIsTokenLocation,
            }
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
        weighted.push({
            ...token,
            howSimilarIsTokenLocation,
            howManyTimesDoesTokenAppear,
            editDistance,
            doesHaveMatch: matchedToken !== undefined,
        })
    })

    // console.log('weighted', weighted)

    return weighted
}

// may need to save at annotation/anchor creation time whether or not the anchor is sub one-line or not
// currently we only know if it's 1 line or greater
const computeLineWeight = (
    weightedLine: WeightedLine,
    typeOfAnchor: number
): number => {
    // single line anchor
    // if(typeOfAnchor === 1) {
    let totals: number[] = weightedLine.code.map((l: WeightedToken) => {
        let total = 0
        if (l.isExactMatch) {
            total += 10
        } else if (l.doesHaveMatch) {
            total += 5
        } else if (l.doesContainAnchor) {
            total += 7
        }
        // else if(l.howManyTimesDoesTokenAppear) {
        //     total -= l.howManyTimesDoesTokenAppear
        // }
        total += l.editDistance
        total += l.howSimilarIsTokenLocation
        return total
    })
    // there is no way this will work -- should add more weight to the isExactMatch and
    // actually check for type of anchor
    console.log('avg', totals.reduce((a, b) => a + b) / totals.length)
    return totals.reduce((a, b) => a + b) / totals.length
    // }
}

const compareCodeLinesByContent = (
    source: CodeLine,
    anchor: CodeLine
): WeightedCodeLine => {
    const weighted: WeightedToken[] =
        anchor.code.length > 1
            ? compareSimilarityOfTokens(source.code, anchor.code)
            : findMostSimilarAnchorTokenInSource(source.code, anchor.code)
    console.log('final weighted', weighted)
    const weightedLine: WeightedLine = { ...source, code: weighted }
    const weightedCodeLine: WeightedCodeLine = {
        codeLine: weightedLine,
        weight: computeLineWeight(weightedLine, anchor.code.length),
    }
    console.log('weightedCodeLine', weightedCodeLine)
    return weightedCodeLine
}

// Given an anchor, and a range of lines to search through,
// sort the sourceCode from most likely to least likely to contain anchor
const proximitySearch = (
    sourceCode: CodeLine[],
    anchorCode: CodeLine[],
    startLine: number,
    endLine: number
): WeightedCodeLine[] => {
    const startSearch = getRangeOfCodeBetweenLines(
        sourceCode,
        startLine,
        anchorCode.length
    )
    console.log('startSearch', startSearch)
    // does our starting point seem promising?
    startSearch.forEach(
        (line, i) => line && compareCodeLinesByContent(line, anchorCode[i])
    )
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
