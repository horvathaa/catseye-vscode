/*
 *
 * anchor.ts
 * Functions that relate to the main code anchor functionalities
 *
 */

import * as vscode from 'vscode'
import { Annotation, AnchorObject, Anchor } from '../constants/constants'
import {
    sortAnnotationsByLocation,
    getProjectName,
    getVisiblePath,
    getGithubUrl,
    getAnnotationsInFile,
    getAllAnnotationFilenames,
    getAnnotationsWithStableGitUrl,
    getAllAnnotationStableGitUrls,
    getAnnotationsNotInFile,
    handleSaveCloseEvent,
} from '../utils/utils'
import {
    annotationDecorations,
    setOutOfDateAnnotationList,
    view,
    annotationList,
    setAnnotationList,
    gitInfo,
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
import {
    saveAnnotations,
    saveOutOfDateAnnotations,
} from '../firebase/functions/functions'

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

// Helper function to take an anchor object (Adamite's representation of an anchor + its metadata) and create a VS Code range object
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
        // console.log('userDeletedAnchor');
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
    let anyChangeOccured: boolean = false
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
            anyChangeOccured = true
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
        anyChangeOccured = true
    }

    // user added lines above start of range
    if (changeRange.start.line < originalStartLine && diff) {
        // console.log('userChangedLinesBeforeStart');
        newRange = userChangedLinesBeforeStart(newRange, originalAnchor, diff)
        anyChangeOccured = true
    }

    // user added new line at the front of our anchor point
    // anchor point should move down
    if (
        changeRange.start.line === originalStartLine &&
        diff &&
        changeRange.start.character === originalStartOffset &&
        originalEndLine === originalStartLine
    ) {
        // console.log('newLineAtStartOffset');
        newRange.startLine = changeRange.end.line + diff
        newRange.endLine = changeRange.end.line + diff
        newRange.startOffset =
            changeText.substring(changeText.lastIndexOf('\n') + 1).length +
            (originalStartOffset - changeRange.start.character)
        newRange.endOffset =
            newRange.startOffset + (originalEndOffset - originalStartOffset)
        anyChangeOccured = true
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
        anyChangeOccured = true
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
        anyChangeOccured = true
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
        anyChangeOccured = true
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
        anyChangeOccured = true
    }

    // user changed text somewhere inside the range - need to update text
    if (
        changeRange.start.line >= originalStartLine &&
        changeRange.end.line <= originalEndLine &&
        !diff
    ) {
        changeOccurredInRange = true
        anyChangeOccured = true
    }

    // update anchor text
    if (changeOccurredInRange) {
        newAnchorText = doc.getText(createRangeFromObject(newRange))
        anyChangeOccured = true
    }

    console.log(
        'gitInfo[commit]',
        gitInfo[getProjectName(doc.uri.toString())].commit
    )

    console.log(
        'change condition',
        checkIfAnchorChanged(originalRange, createRangeFromObject(newRange)) ||
            changeOccurredInRange,
        'func',
        checkIfAnchorChanged(originalRange, createRangeFromObject(newRange)),
        'var',
        changeOccurredInRange
    )

    const originalGitCommit = anchorObject.gitCommit
    const newRangeObj = createRangeFromObject(newRange)

    // update anchor object
    const newAnchor: AnchorObject = {
        ...anchorObject,
        anchorText: newAnchorText,
        anchor: newRange,
        gitCommit:
            checkIfAnchorChanged(originalRange, newRangeObj) ||
            // changeOccurredInRange
            (originalRange.start.isBefore(changeRange.start) &&
                originalRange.end.isAfter(changeRange.end))
                ? gitInfo[getProjectName(doc.uri.toString())].commit
                : originalGitCommit,
    }

    return newAnchor
}

// Helper function to transform all anchors into an array of VS Code ranges
export function createRangesFromAnnotation(
    annotation: Annotation
): vscode.Range[] {
    return annotation.anchors.flatMap((a: AnchorObject) =>
        createRangeFromAnchorObject(a)
    )
}

// Function to make VS Code decoration objects (the highlights that appear in the editor) with our metadata added
const createDecorationOptions = (
    ranges: AnnotationRange[],
    annotationList: Annotation[]
): vscode.DecorationOptions[] => {
    // console.log('annotationList', annotationList, 'ranges', ranges);
    return ranges.map((r) => {
        let markdownArr = new Array<vscode.MarkdownString>()
        markdownArr.push(
            new vscode.MarkdownString(
                annotationList.find((a) => a.id === r.annotationId)?.annotation
            )
        )
        const showAnnoInWebviewCommand = vscode.Uri.parse(
            `command:adamite.showAnnoInWebview?${encodeURIComponent(
                JSON.stringify(r.annotationId)
            )}`
        )
        let showAnnoInWebviewLink: vscode.MarkdownString =
            new vscode.MarkdownString()
        showAnnoInWebviewLink.isTrusted = true
        showAnnoInWebviewLink.appendMarkdown(
            `[Show Annotation](${showAnnoInWebviewCommand})`
        )
        markdownArr.push(showAnnoInWebviewLink)
        return {
            range: r.range,
            hoverMessage: markdownArr,
        }
    })
}

interface AnnotationRange {
    annotationId: string
    anchorText: string
    range: vscode.Range
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
            validRanges.push(r)
        }
        // valid range is equivalent to original range so update range
        else if (
            text.document.getText(validRange) === r.anchorText &&
            r.anchorText !== ''
        ) {
            r.range = validRange
            validRanges.push(r)
        }
        // valid range is not similar so we are screwed
        else {
            invalidRanges.push(r)
        }
    })
    return [validRanges, invalidRanges]
}

// Function to actually decorate each file with our annotation highlights
export const addHighlightsToEditor = (
    annotationsToHighlight: Annotation[],
    text: vscode.TextEditor
): void => {
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
        let anchors: AnchorObject[] = annotationsToHighlight
            .flatMap((a) => a.anchors)
            .filter((a) => a.stableGitUrl === textUrl)
        let ranges: AnnotationRange[] = anchors
            .map((a) => {
                return {
                    annotationId: a.parentId,
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
                }
            })

        if (ranges.length) {
            const updatedIds: string[] = ranges.map((r) => r.annotationId)
            const [validRanges, invalidRanges] = validateRanges(ranges, text)
            const validIds: string[] = validRanges.map((r) => r.annotationId)
            const valid: Annotation[] = annotationsToHighlight.filter(
                (a: Annotation) => validIds.includes(a.id)
            )
            valid.forEach((a: Annotation) => (a.outOfDate = false))
            // bring back annotations that are not in the file
            const newAnnotationList: Annotation[] =
                //sortAnnotationsByLocation(
                valid.concat(
                    annotationList.filter((a) => !updatedIds.includes(a.id))
                )
            // )

            setAnnotationList(newAnnotationList)

            try {
                const decorationOptions: vscode.DecorationOptions[] =
                    createDecorationOptions(validRanges, newAnnotationList)
                text.setDecorations(annotationDecorations, decorationOptions)
            } catch (error) {
                console.error("Couldn't highlight: ", error)
            }

            if (invalidRanges.length) {
                const invalidIds: string[] = invalidRanges.map(
                    (r) => r.annotationId
                )
                saveOutOfDateAnnotations(invalidIds)
            }
            // if (vscode.workspace.workspaceFolders) {
            //     view?.updateDisplay(newAnnotationList)
            // }
        }
    }

    // nothing
    else {
        console.log('nothing to highlight -- updating anyways')
        view?.updateDisplay(annotationList) // update that list is empty ?
        text?.setDecorations(annotationDecorations, [])
    }
}
