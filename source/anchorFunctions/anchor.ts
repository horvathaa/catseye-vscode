/*
 *
 * anchor.ts
 * Functions that relate to the main code anchor functionalities
 *
 */

import * as vscode from 'vscode'
import {
    Annotation,
    AnchorObject,
    Anchor,
    NUM_SURROUNDING_LINES,
    SurroundingAnchorArea,
    AnchorType,
    PotentialAnchorObject,
} from '../constants/constants'
import {
    // sortAnnotationsByLocation,
    getProjectName,
    getVisiblePath,
    getGithubUrl,
    getAnnotationsInFile,
    getAllAnnotationFilenames,
    // getAnnotationsWithStableGitUrl,
    getAllAnnotationStableGitUrls,
    // getAnnotationsNotInFile,
    // handleSaveCloseEvent,
    // levenshteinDistance,
    buildAnnotation,
    removeNulls,
    partition,
    objectsEqual,
} from '../utils/utils'
import {
    annotationDecorations,
    // setOutOfDateAnnotationList,
    view,
    annotationList,
    setAnnotationList,
    gitInfo,
    showResolved,
} from '../extension'
import {
    userDeletedAnchor,
    userAutocompletedOrCommented,
    userChangedTextBeforeStart,
    userChangedTextBeforeEnd,
    userChangedLinesBeforeStart,
    userChangedLinesInMiddle,
    shrinkOrExpandBackOfRange,
    shrinkOrExpandFrontOfRange,
} from './translateChangesHelpers'

// import { computeMostSimilarAnchor } from './reanchor'
import { refreshFoldingRanges } from '../foldingRangeProvider/foldingRangeProvider'

// Used for finding new anchor point given copy/paste operation
// Given offsetData generated at the time of copying (offset being where the anchor is relative to the beginning of the user's selection)
// and the pasted range's starting point, find new placement for the annotation
export const computeRangeFromOffset = (
    range: vscode.Range,
    offsetData: { [key: string]: any }
): Anchor => {
    const newAnchor = {
        startLine: range.start.line + offsetData.startLine,
        startOffset: range.start.character + offsetData.startOffset,
        endLine: range.start.line + offsetData.endLine,
        endOffset: range.end.character + offsetData.endOffset,
    }

    return newAnchor
}

export const connectPotentialAnchorsToAnchors = (
    pas: PotentialAnchorObject[],
    anchors: AnchorObject[]
): AnchorObject[] => {
    let newAnchors: AnchorObject[] = anchors
    const anchorIds: string[] = []
    pas.forEach((p: PotentialAnchorObject) => {
        const anchor = newAnchors.find((a) => a.anchorId === p.anchorId)
        if (anchor) {
            const updatedPotentialReanchorSpots = [
                ...anchor.potentialReanchorSpots.filter(
                    (a) => a.paoId !== p.paoId
                ),
                p,
            ]
            newAnchors = [
                ...newAnchors.filter((a) => a.anchorId !== anchor.anchorId),
                {
                    ...anchor,
                    potentialReanchorSpots: updatedPotentialReanchorSpots,
                },
            ]
            anchorIds.push(anchor.anchorId)
        } else {
            console.log(
                "could not find potential anchor object's anchor -- returning pa"
            )
        }
    })

    return newAnchors
    // .concat(
    //     anchors.filter((a) => !anchorIds.includes(a.anchorId))
    // )
}

export const handleUpdatingTranslatedAnnotations = (
    a: Annotation,
    stableGitPath: string,
    change: vscode.TextDocumentContentChangeEvent,
    diff: number,
    e: vscode.TextDocumentChangeEvent
): Annotation => {
    const [anchorsToTranslate, anchorsNotToTranslate] = partition(
        a.anchors,
        // (a: AnchorObject) => a.filename === e.document.uri.toString()
        (a: AnchorObject) => a.stableGitUrl === stableGitPath && a.anchored
    )
    const potentialAnchorsToTranslate = a.anchors
        .flatMap((a) => a.potentialReanchorSpots)
        .filter(
            (anch: PotentialAnchorObject) => anch.stableGitUrl === stableGitPath
        )

    const translate: (AnchorObject | null)[] = anchorsToTranslate.map(
        (a: AnchorObject) =>
            translateChanges(
                a,
                change.range,
                change.text.length,
                diff,
                change.rangeLength,
                e.document,
                change.text
            )
    )
    if (translate.every((n) => n === null)) {
        return buildAnnotation({
            ...a,
            deleted: true,
            needToUpdate: true,
            anchors: anchorsToTranslate.map((anch: AnchorObject) => {
                return { ...anch, anchored: false }
            }),
        })
    }
    const translatedAnchors = removeNulls(translate)
    const translatedPotentialAnchors: PotentialAnchorObject[] = removeNulls(
        potentialAnchorsToTranslate.map((a: PotentialAnchorObject) => {
            return translateChanges(
                a,
                change.range,
                change.text.length,
                diff,
                change.rangeLength,
                e.document,
                change.text
            )
        })
    )

    const needToUpdate = translatedAnchors.some((t) => {
        const anchor = anchorsToTranslate.find(
            (o: AnchorObject) => t.anchorId === o.anchorId
        )
        return (
            !objectsEqual(anchor.anchor, t.anchor) ||
            t.anchorText !== anchor.anchorText
        )
    })
    const gitCommit: string | undefined = translatedAnchors.find((t) => {
        return t.gitCommit === gitInfo[a.projectName].commit
    })?.gitCommit
    const originalGitCommit = a.gitCommit
    const updatedAnchors = connectPotentialAnchorsToAnchors(
        translatedPotentialAnchors,
        translatedAnchors.concat(anchorsNotToTranslate)
    )

    return buildAnnotation({
        ...a,
        needToUpdate,
        gitCommit: gitCommit ? gitCommit : originalGitCommit,
        anchors: updatedAnchors,
    })
}

// const addLinesWithContent = (
//     textBefore: string,
//     document: vscode.TextDocument,
//     anchorRange: vscode.Range
// ): string[] => {
//     let textToSplit = textBefore
//     let contentLines: string[] = textBefore
//         .split('\n')
//         .filter((t) => t.trim().length !== 0)
//     let startPosition: number =
//         anchorRange.start.line - NUM_SURROUNDING_LINES + 1 - contentLines.length
//     // let initialStart = startPosition
//     let endPosition: number = anchorRange.start.line
//     let initialEnd = endPosition
//     let finalStart: number = 0
//     // let finalEnd: number = 0
//     console.log('start?', startPosition)
//     console.log('contentLines before loop', contentLines)
//     let numRemovedWhiteSpace: number = textBefore
//         .split('\n')
//         .filter((t) => t.trim().length === 0).length
//     // startPosition = anchorRange.start.line - (NUM_SURROUNDING_LINES + 1 - contentLines.length)
//     // endPosition = anchorRange.start.line - NUM_SURROUNDING_LINES
//     // if we have whitespace-only lines, get lines before that are not whitespace
//     while (
//         contentLines.length < NUM_SURROUNDING_LINES + 1 &&
//         endPosition !== 0
//     ) {
//         console.log('in while - start', startPosition, 'end', endPosition)
//         textToSplit = document.getText(
//             document.validateRange(
//                 new vscode.Range(
//                     new vscode.Position(startPosition, 0),
//                     new vscode.Position(endPosition, 10000)
//                 )
//             )
//         )
//         contentLines.splice(
//             0,
//             0,
//             ...textToSplit.split('\n').filter((t) => t.trim().length !== 0)
//         )
//         contentLines = [
//             ...new Set(contentLines.map((l) => l.replace(/\s+/g, ''))),
//         ]
//         console.log('contentLines', contentLines)
//         console.log('textToSplit', textToSplit)
//         const whitespace = textToSplit
//             .split('\n')
//             .filter((t) => t.trim().length === 0).length
//         numRemovedWhiteSpace += whitespace
//         finalStart = startPosition
//         // finalEnd = endPosition
//         endPosition = startPosition
//         startPosition = startPosition - whitespace
//     }
//     if (contentLines.length > NUM_SURROUNDING_LINES + 1) {
//         console.log(
//             'contentLines',
//             contentLines,
//             'math',
//             contentLines.length - NUM_SURROUNDING_LINES - 1
//         )
//         contentLines.splice(0, contentLines.length - NUM_SURROUNDING_LINES - 1)
//     }

//     console.log(
//         'removed',
//         document
//             .getText(
//                 document.validateRange(
//                     new vscode.Range(
//                         new vscode.Position(finalStart, 0),
//                         new vscode.Position(initialEnd, 10000)
//                     )
//                 )
//             )
//             .split('\n')
//             .filter((t) => t.trim().length === 0).length
//     )
//     return contentLines
// }

export const isAnchorObject = (a: any): a is AnchorObject => {
    return a.hasOwnProperty('anchorText')
}

export const getSurroundingCodeArea = (
    document: vscode.TextDocument,
    anchorInfo: AnchorObject | vscode.Range
): SurroundingAnchorArea => {
    const anchorRange = isAnchorObject(anchorInfo)
        ? createRangeFromAnchorObject(anchorInfo)
        : anchorInfo
    return {
        linesAfter: getSurroundingLinesAfterAnchor(document, anchorRange),
        linesBefore: getSurroundingLinesBeforeAnchor(document, anchorRange),
    }
}

export const getAnchorType = (
    anchor: Anchor,
    document: vscode.TextDocument
): AnchorType => {
    const isSingleOrPartial = anchor.startLine === anchor.endLine
    if (!isSingleOrPartial) {
        return AnchorType.multiline
    } else {
        const anchorText = document
            .getText(createRangeFromObject(anchor))
            .trim()
        const docText = document
            .getText(
                document.validateRange(
                    new vscode.Range(anchor.startLine, 0, anchor.endLine, 10000)
                )
            )
            .trim()
        if (anchorText !== docText || anchorText.length < docText.length) {
            return AnchorType.partialLine
        } else {
            return AnchorType.oneline
        }
    }
}

export const getSurroundingLinesBeforeAnchor = (
    document: vscode.TextDocument,
    anchorRange: vscode.Range
): string[] => {
    try {
        // set top of new line to 0 if cannot grab -5 lines
        const offSetFromTopOfDoc =
            anchorRange.start.line - NUM_SURROUNDING_LINES < 0
                ? 0
                : anchorRange.start.line - NUM_SURROUNDING_LINES
        let textBefore = document.getText(
            document.validateRange(
                new vscode.Range(
                    new vscode.Position(offSetFromTopOfDoc, 0),
                    new vscode.Position(anchorRange.start.line, 10000)
                )
            )
        )
        // console.log(addLinesWithContent(textBefore, document, anchorRange))

        return textBefore.split('\n')
    } catch (e) {
        console.log(e)
        console.log('could not add before')
    }
    return []
    // consider removing whitespace by calling above function
    // pros: more semantically-meaningful content
    // cons: may make it harder to find since we don't have a concept of how many whitespace lines we removed i.e., how far apart these lines
    // actually are from one another
}

export const getSurroundingLinesAfterAnchor = (
    document: vscode.TextDocument,
    anchorRange: vscode.Range
): string[] => {
    try {
        const textAfter = document.getText(
            document.validateRange(
                new vscode.Range(
                    new vscode.Position(anchorRange.end.line, 0),
                    new vscode.Position(
                        anchorRange.end.line + NUM_SURROUNDING_LINES >=
                        document.lineCount
                            ? document.lineCount - 1
                            : anchorRange.end.line + NUM_SURROUNDING_LINES,
                        10000
                    )
                )
            )
        )
        return textAfter.split('\n')
    } catch (e) {
        console.log(e)
    }
    return []
}

export const computeVsCodeRangeFromOffset = (
    range: vscode.Range,
    offsetData: { [key: string]: any }
): vscode.Range => {
    return new vscode.Range(
        new vscode.Position(
            range.start.line + offsetData.startLine,
            range.start.character + offsetData.startOffset
        ),
        new vscode.Position(
            range.start.line + offsetData.endLine,
            range.end.character + offsetData.endOffset
        )
    )
}

// Helper function to take an anchor object (catseye's representation of an anchor + its metadata) and create a VS Code range object
// from the anchor point
export const createRangeFromAnchorObject = (
    anchor: AnchorObject
): vscode.Range => {
    return createRangeFromObject(anchor.anchor)
}

// Helper function to take anchor and transform into VS Code range
export function createRangeFromObject(obj: Anchor): vscode.Range {
    return new vscode.Range(
        obj.startLine,
        obj.startOffset,
        obj.endLine,
        obj.endOffset
    )
}

// Helper function to create an anchor given a VS Code range object
export const createAnchorFromRange = (range: vscode.Range): Anchor => {
    return {
        startLine: range.start.line,
        startOffset: range.start.character,
        endLine: range.end.line,
        endOffset: range.end.character,
    }
}

// Helper function to create an anchor given VS Code position objects
export const createAnchorFromPositions = (
    startPosition: vscode.Position,
    endPosition: vscode.Position
): Anchor => {
    return {
        startLine: startPosition.line,
        startOffset: startPosition.character,
        endLine: endPosition.line,
        endOffset: endPosition.character,
    }
}

// Helper function to update an anchor in the anchor object given the annotation ID, anchor ID, and a new anchor object
export const updateAnchorInAnchorObject = (
    id: string,
    annoId: string,
    anchor: Anchor
): AnchorObject[] => {
    const anno: Annotation | undefined = annotationList.find(
        (a) => a.id === annoId
    )
    const anchorObject: AnchorObject | undefined = anno?.anchors.find(
        (a: AnchorObject) => a.anchorId === id
    )
    if (anno && anchorObject)
        return anno.anchors
            .filter((a: AnchorObject) => a.anchorId !== id)
            .concat({ ...anchorObject, anchor })
    return [] // this sucks
}

// Helper function that takes a VS Code selection and finds any anchor points that exist in that select
export const getAnchorsInRange = (
    selection: vscode.Selection,
    annotationList: Annotation[]
): { [key: string]: any }[] => {
    const anchorsInSelection: { [key: string]: any }[] = annotationList
        .flatMap((a) => a.anchors)
        .map((a: AnchorObject) => {
            return { anchor: a, range: createRangeFromAnchorObject(a) }
        })
        .filter((a) => selection.contains(a.range))
    return anchorsInSelection
}

// Helper function to find any anchors that exist in the current file
// Notes: currentFile is optional to make calling the method easier
export const getAnchorsInCurrentFile = (
    annotationList: Annotation[],
    currentFile?: string
): AnchorObject[] => {
    const annos: Annotation[] = currentFile
        ? getAnnotationsInFile(annotationList, currentFile)
        : annotationList
    if (!currentFile)
        currentFile = vscode.window.activeTextEditor?.document.uri.toString()
    let anchors: AnchorObject[] = []
    annos.forEach((a) => {
        const annoAnchors = a.anchors.filter(
            (a: AnchorObject) => a.filename === currentFile
        )
        anchors = anchors.concat(annoAnchors)
    })
    return anchors
}

export const getAnchorsWithGitUrl = (gitUrl: string): AnchorObject[] => {
    const filteredAnnos = annotationList.filter((a) =>
        gitUrl.includes(a.gitRepo.split('.git')[1])
    )
    const candidateAnchors = filteredAnnos.flatMap((a) => a.anchors)
    return candidateAnchors.filter((a) => a.stableGitUrl === gitUrl)
}

const checkIfAnchorChanged = (
    originalRange: vscode.Range,
    newRange: vscode.Range
): boolean => {
    return !originalRange.isEqual(newRange)
}

// The meat and potatoes of keeping anchor points up to date
// Gets called on every keystroke for files that contain annotations
// Uses a series of methods to, given the details VS Code gave us about the edit operation performed,
// determine how to update our internal representation of each anchor
// Most likely has bugs since it is difficult to know how to update anchor points since
// there are many many ways to change a file and these events sometimes happen in batch (e.g., when someone uses a prettifier to clean their whole file)
export const translateChanges = (
    anchorObject: AnchorObject, // the anchor object that will be updated
    changeRange: vscode.Range, // the range that encapsulates the edit the user made
    textLength: number, // how many characters were inserted (0 if deleting)
    diff: number, // how many lines were inserted or removed
    rangeLength: number, // in case of delete, how many characters were removed
    doc: vscode.TextDocument, // the document that was updated
    changeText: string // a copy of the text the user inserted
): AnchorObject | null => {
    // null if the anchor is removed
    const originalStartLine = anchorObject.anchor.startLine,
        originalEndLine = anchorObject.anchor.endLine,
        originalStartOffset = anchorObject.anchor.startOffset,
        originalEndOffset = anchorObject.anchor.endOffset
    let newRange = {
        startLine: originalStartLine,
        endLine: originalEndLine,
        startOffset: originalStartOffset,
        endOffset: originalEndOffset,
    }
    let originalAnchor = newRange
    const { anchorText } = anchorObject
    let newAnchorText = anchorText
    const startAndEndLineAreSameNoNewLine =
        originalStartLine === changeRange.start.line &&
        originalEndLine === changeRange.end.line &&
        !diff
    const startAndEndLineAreSameNewLine =
        originalStartLine === changeRange.start.line &&
        originalEndLine === changeRange.end.line &&
        (diff > 0 || diff < 0)
    const originalRange = new vscode.Range(
        new vscode.Position(originalStartLine, originalStartOffset),
        new vscode.Position(originalEndLine, originalEndOffset)
    )

    const isDeleteOperation: boolean = !textLength

    // user deleted the code that contained the original anchor point
    if (isDeleteOperation && changeRange.contains(originalRange)) {
        return userDeletedAnchor(anchorObject.parentId, anchorObject.anchorId)
    }

    // user added a whole bunch of text that somehow contains the original anchor point
    // usually happens when a very large change occurs, such as a git checkout or pull operation
    if (!isDeleteOperation && changeRange.contains(originalRange)) {
        // console.log('git Operation most likely...');
    }

    // if the user made a modification after the end point of our anchor, our anchor is not affected and we return
    if (changeRange.start.isAfter(originalRange.end)) {
        return anchorObject
    }
    let changeOccurredInRange: boolean = false
    textLength = userAutocompletedOrCommented(
        changeText,
        textLength,
        rangeLength
    )
    // user adds/removes text at or before start of anchor on same line (no new lines)
    if (
        changeRange.start.character <= originalStartOffset &&
        changeRange.start.line === originalStartLine &&
        !diff
    ) {
        // console.log('userChangedTextBeforeStart');
        newRange = userChangedTextBeforeStart(
            newRange,
            originalAnchor,
            changeRange,
            isDeleteOperation,
            textLength,
            rangeLength,
            startAndEndLineAreSameNoNewLine,
            originalAnchor.startOffset === changeRange.start.character
        )
        if (originalAnchor.startOffset === changeRange.start.character) {
            changeOccurredInRange = true
        }
    }

    // user adds/removes text at or before the end offset (no new lines)
    else if (
        changeRange.end.line === originalEndLine &&
        (changeRange.end.character <= originalEndOffset ||
            changeRange.start.character <= originalEndOffset) &&
        !diff
    ) {
        // console.log('userChangedTextBeforeEnd');
        newRange = userChangedTextBeforeEnd(
            newRange,
            originalAnchor,
            isDeleteOperation,
            textLength,
            rangeLength,
            changeRange
        )
        changeOccurredInRange = true
    }

    // user added lines above start of range
    if (changeRange.start.line < originalStartLine && diff) {
        // console.log('userChangedLinesBeforeStart');
        newRange = userChangedLinesBeforeStart(newRange, originalAnchor, diff)
    }

    // user added new line at or before the front of our anchor point
    // anchor point should move down
    if (
        changeRange.start.line === originalStartLine &&
        diff &&
        changeRange.start.character <= originalStartOffset &&
        originalEndLine === originalStartLine
    ) {
        console.log('newLineAtStartOffset')
        newRange.startLine = changeRange.end.line + diff
        newRange.endLine = changeRange.end.line + diff
        newRange.startOffset =
            changeText.substring(changeText.lastIndexOf('\n') + 1).length +
            (originalStartOffset - changeRange.start.character)
        newRange.endOffset =
            newRange.startOffset + (originalEndOffset - originalStartOffset)
    }

    // user added/removed line in middle of the anchor -- we are not including end offset
    else if (
        changeRange.start.line >= originalStartLine &&
        changeRange.end.line <= originalEndLine &&
        diff &&
        changeRange.start.isAfterOrEqual(originalRange.start) &&
        changeRange.end.isBeforeOrEqual(originalRange.end)
    ) {
        changeOccurredInRange = true
        // console.log('userChangedLinesInMiddle');
        newRange = userChangedLinesInMiddle(
            newRange,
            originalAnchor,
            changeRange,
            diff,
            startAndEndLineAreSameNewLine,
            anchorText,
            changeText,
            textLength,
            rangeLength,
            originalRange
        )
    }

    // user's edit started in the middle of our anchor point but (possibly) ends past the point our anchor ends
    else if (
        changeRange.start.line >= originalStartLine &&
        changeRange.start.line <= originalEndLine &&
        changeRange.end.line >= originalEndLine &&
        diff
    ) {
        // console.log('shrinkOrExpandBackOfRange');
        newRange = shrinkOrExpandBackOfRange(
            newRange,
            changeRange,
            diff,
            changeText,
            anchorText,
            rangeLength,
            originalAnchor,
            originalRange
        )
    }

    // user's edit started before our anchor point but ends in the middle of our anchor point
    else if (
        changeRange.end.line >= originalStartLine &&
        changeRange.end.line <= originalEndLine &&
        changeRange.start.line <= originalEndLine &&
        diff
    ) {
        // console.log('shrinkOrExpandFrontOfRange');
        newRange = shrinkOrExpandFrontOfRange(
            newRange,
            changeRange,
            diff,
            changeText,
            anchorText,
            rangeLength,
            originalStartLine,
            originalStartOffset
        )
    }

    // shrink end of anchor if it is just white space
    if (
        newRange.endOffset === 0 ||
        doc
            .getText(
                new vscode.Range(
                    newRange.endLine,
                    0,
                    newRange.endLine,
                    newRange.endOffset
                )
            )
            .replace(/\s/g, '').length === 0
    ) {
        // may want to do this until we hit a line with text (e.g., while loop instead of just doing this check once)
        newRange.endLine = newRange.endLine - 1
        newRange.endOffset = doc.getText(
            doc.validateRange(
                new vscode.Range(newRange.endLine, 0, newRange.endLine, 500)
            )
        ).length
    }

    // user changed text somewhere inside the range - need to update text
    if (
        changeRange.start.line >= originalStartLine &&
        changeRange.end.line <= originalEndLine &&
        !diff
    ) {
        changeOccurredInRange = true
    }

    // update anchor text
    if (changeOccurredInRange) {
        newAnchorText = doc.getText(createRangeFromObject(newRange))
    }

    const originalGitCommit = anchorObject.gitCommit
    const newRangeObj = doc.validateRange(createRangeFromObject(newRange))

    // update anchor object
    const newAnchor: AnchorObject = {
        ...anchorObject,
        anchorText: newAnchorText,
        anchor: newRange,
        // update surrounding lines here or at save
        gitCommit:
            checkIfAnchorChanged(originalRange, newRangeObj) ||
            // changeOccurredInRange
            (originalRange.start.isBefore(changeRange.start) &&
                originalRange.end.isAfter(changeRange.end))
                ? gitInfo[getProjectName(doc.uri.toString())].commit
                : originalGitCommit,
    }

    const newAnchorWithSurroundingContext: AnchorObject = {
        ...newAnchor,
        surroundingCode: getSurroundingCodeArea(doc, newAnchor),
    }

    return newAnchorWithSurroundingContext
}

// Helper function to transform all anchors into an array of VS Code ranges
export function createRangesFromAnnotation(
    annotation: Annotation
): vscode.Range[] {
    return annotation.anchors.flatMap((a: AnchorObject) =>
        createRangeFromAnchorObject(a)
    )
}

export interface AnnotationRange extends AnnotationAnchorPair {
    anchorText: string
    range: vscode.Range
    valid?: boolean
}

export interface AnnotationAnchorPair {
    annotationId: string
    anchorId: string | string[]
}

const validateRanges = (
    ranges: AnnotationRange[],
    text: vscode.TextEditor
): [AnnotationRange[], AnnotationRange[]] => {
    const validRanges: AnnotationRange[] = [],
        invalidRanges: AnnotationRange[] = []
    ranges.forEach((r: AnnotationRange) => {
        const validRange: vscode.Range = text.document.validateRange(r.range)
        // range is already clean
        if (validRange.isEqual(r.range)) {
            r.range = validRange
            validRanges.push({ ...r, valid: true })
        }
        // valid range is equivalent to original range so update range
        else if (
            text.document.getText(validRange) === r.anchorText &&
            r.anchorText !== ''
        ) {
            r.range = validRange
            validRanges.push({ ...r, valid: true })
        }
        // valid range is not similar so we are screwed
        else {
            invalidRanges.push({ ...r, valid: false })
        }
    })
    return [validRanges, invalidRanges]
}

const tempDecoration = vscode.window.createTextEditorDecorationType({
    // borderWidth: '0.25px',
    // borderStyle: 'solid',
    overviewRulerLane: vscode.OverviewRulerLane.Right,

    light: {
        // this color will be used in light color themes
        // borderColor: 'darkblue',
        border: '0.15px solid rgba(0, 0, 0, .25)',
        overviewRulerColor: 'darkgreen',
        backgroundColor: '#cde8c5',
    },
    dark: {
        // this color will be used in dark color themes
        // borderColor: ,
        border: '0.15px solid rgba(217, 234, 247, .25)',
        overviewRulerColor: 'lightgreen',
        backgroundColor: 'rgba(236, 255, 193, .25)',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
})

export const addTempAnnotationHighlight = (
    anchors: AnchorObject[],
    textEditor: vscode.TextEditor
): void => {
    const ranges = anchors.map((a) => createRangeFromAnchorObject(a))
    const decorationObjects: vscode.DecorationOptions[] = ranges.map((r) => {
        let markdownArr = new Array<vscode.MarkdownString>()
        markdownArr.push(
            new vscode.MarkdownString("New annotation's anchor point")
        )
        return {
            range: r,
            hoverMessage: markdownArr,
        }
    })
    textEditor.setDecorations(tempDecoration, decorationObjects)
}

const getDupIds = (arr: string[]): string[] => {
    return arr.filter((value: string, index: number, self: string[]) => {
        return self.indexOf(value) !== index
    })
}

const mergeAnnotationAndAnchorIds = (pairs: AnnotationAnchorPair[]) => {
    const annoIds = pairs.map((p) => p.annotationId)
    const uniqueIds = [...new Set(annoIds)]
    // only dealing with unique
    if (annoIds.length === uniqueIds.length) {
        return pairs
    } else {
        const dups = getDupIds(annoIds)
        return dups.map((id: string) => {
            return {
                annotationId: id,
                anchorId: pairs
                    .filter((p) => p.annotationId === id)
                    .flatMap((pid) => pid.anchorId),
            }
        })
    }
}
// when to MARK an anchor as broken?
// -- on highlight
// when to COMPUTE broken anchors' reattachment points?
// -- on git checkout/pull
// -- on user request
//

// Function to actually decorate each file with our annotation highlights
export const addHighlightsToEditor = (
    annosToHighlight: Annotation[],
    text: vscode.TextEditor
): void => {
    const annotationsToHighlight = annosToHighlight.filter(
        (a) => !a.deleted && !a.outOfDate
    )
    const filenames = getAllAnnotationFilenames(annotationsToHighlight)
    const githubUrls = getAllAnnotationStableGitUrls(annotationsToHighlight)
    const projectName = getProjectName(text?.document.uri.toString())
    const textUrl = text
        ? getGithubUrl(
              getVisiblePath(projectName, text.document.uri.fsPath),
              projectName,
              true
          )
        : ''
    // console.log('annotationsToHighlight', annotationsToHighlight);
    if (
        annotationsToHighlight.length &&
        text &&
        (filenames.includes(text.document.uri.toString()) ||
            githubUrls.includes(textUrl))
    ) {
        let anchors: AnchorObject[] = showResolved
            ? annotationsToHighlight
                  .flatMap((a) => a.anchors)
                  .filter((a) => a.stableGitUrl === textUrl)
                  .filter((a) => a.anchored)
            : annotationsToHighlight
                  .filter((a) => !a.resolved)
                  .flatMap((a) => a.anchors)
                  .filter((a) => a.stableGitUrl === textUrl)
                  .filter((a) => a.anchored)
        // console.log('anchors', anchors)
        let ranges: AnnotationRange[] = anchors
            .map((a) => {
                return {
                    annotationId: a.parentId,
                    anchorId: a.anchorId,
                    anchorText: a.anchorText,
                    url: a.stableGitUrl,
                    filename: a.filename,
                    range: createRangeFromAnchorObject(a),
                }
            })
            .filter((r) => r.url === textUrl)
            .map((a) => {
                return {
                    annotationId: a.annotationId,
                    anchorText: a.anchorText,
                    range: a.range,
                    anchorId: a.anchorId,
                }
            })

        if (ranges.length) {
            const updatedIds: string[] = ranges.map((r) => r.annotationId)
            const [validRanges, invalidRanges] = validateRanges(ranges, text)
            const validIds: string[] = validRanges.map((r) => r.annotationId)
            const valid: Annotation[] = annotationsToHighlight.filter(
                (a: Annotation) => validIds.includes(a.id)
            )

            let unanchoredAnnotations: Annotation[] = []

            if (invalidRanges.length) {
                unanchoredAnnotations = handleInvalidAnchors(
                    invalidRanges,
                    annotationsToHighlight,
                    text.document
                )
            }

            valid.forEach((a: Annotation) => (a.outOfDate = false))
            // bring back annotations that are not in the file
            const newAnnotationList: Annotation[] = valid.concat(
                annotationList.filter((a) => !updatedIds.includes(a.id))
            )

            setAnnotationList(newAnnotationList.concat(unanchoredAnnotations))
            unanchoredAnnotations.length && view?.updateDisplay(annotationList)
            try {
                text.setDecorations(annotationDecorations, validRanges)
                refreshFoldingRanges()
            } catch (error) {
                console.error("Couldn't highlight: ", error)
            }
        } else {
            // no ranges to highlight for this file -- reset
            try {
                text.setDecorations(annotationDecorations, [])
                refreshFoldingRanges()
            } catch (error) {
                console.error("Couldn't highlight: ", error)
            }
        }
    }

    // nothing
    else {
        view?.updateDisplay(annotationList) // update that list is empty ?
        text?.setDecorations(annotationDecorations, [])
    }
}

const handleInvalidAnchors = (
    invalidRanges: AnnotationRange[],
    annotationsToHighlight: Annotation[],
    document: vscode.TextDocument
) => {
    let unanchoredAnnotations: Annotation[] = []
    const invalidIds: AnnotationAnchorPair[] = invalidRanges.map((r) => {
        return {
            annotationId: r.annotationId,
            anchorId: r.anchorId,
        }
    })

    const mergedInvalidIds = mergeAnnotationAndAnchorIds(invalidIds)

    // these annos have become unanchored
    unanchoredAnnotations = removeNulls(
        mergedInvalidIds.map((a: AnnotationAnchorPair) => {
            const anno = annotationsToHighlight.find(
                (ann) => ann.id === a.annotationId
            )
            const anchors =
                typeof a.anchorId === 'string'
                    ? anno?.anchors.find((anch) => anch.anchorId === a.anchorId)
                    : anno?.anchors.filter((anch) =>
                          a.anchorId.includes(anch.anchorId)
                      )
            if (anno && anchors) {
                // should change this to only compute potential anchors for NEWLY unanchored annotations
                // other anchors should just have their suggestions be updated in translateChanges (or maybe we already do that?)
                const newAnchors = Array.isArray(anchors)
                    ? anchors.map((anch) => {
                          return { ...anch, anchored: false }
                      })
                    : [{ ...anchors, anchored: false }]
                // const anchorsWithPotentialAnchors = newAnchors.map((a) =>
                //     computeMostSimilarAnchor(document, a)
                // )
                return buildAnnotation({
                    ...anno,
                    anchors: anno.anchors
                        .filter((anch) => {
                            return typeof a.anchorId === 'string'
                                ? anch.anchorId !== a.anchorId
                                : !a.anchorId.includes(anch.anchorId)
                        })
                        .concat(newAnchors), // for now, just mark as not anchored
                    needToUpdate: true,
                    // outOfDate: true,
                })
            } else {
                return null
            }
        })
    )
    // console.log('huh?', unanchoredAnnotations)
    return unanchoredAnnotations
    // saveOutOfDateAnnotations(invalidIds)
}

// confirm whether our anchor is consistent with what is in its document
export const validateAnchor = (
    a: AnchorObject,
    document: vscode.TextDocument
): boolean => {
    const range = createRangeFromAnchorObject(a)
    return (
        document.validateRange(range).isEqual(range) &&
        document.getText(range) === a.anchorText
    )
}
