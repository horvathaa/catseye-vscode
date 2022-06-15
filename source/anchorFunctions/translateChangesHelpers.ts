/*
 * 
 * translateChangesHelpers.ts
 * Functions that relate to the updating anchor positions given a change
 *
 */

import { tabSize, insertSpaces, annotationList, deletedAnnotations, setDeletedAnnotationList, selectedAnnotationsNavigations, setSelectedAnnotationsNavigations } from "../extension";
import { createRangeFromObject } from "./anchor";
import { Annotation, Anchor, AnchorObject } from '../constants/constants';
import { buildAnnotation } from '../utils/utils';
import * as vscode from 'vscode';

// If the user deleted an annotation, find and remove that anchor and (possibly) the whole annotation
// if that was the annotation's only anchor
export const userDeletedAnchor = (annotationId: string, anchorId: string) : null => {
    const affectedAnnotation: Annotation | undefined = annotationList.find((a: Annotation) => a.id === annotationId);
    if(!affectedAnnotation) return null;
    const updatedAnchors: AnchorObject[] = affectedAnnotation.anchors.filter((a: AnchorObject) => a.anchorId !== anchorId);
    if(selectedAnnotationsNavigations.map(a => a.anchorId).includes(anchorId)) {
        setSelectedAnnotationsNavigations(selectedAnnotationsNavigations.filter(nav => nav.anchorId !== anchorId && nav.id !== annotationId));
    }
    if(!updatedAnchors.length) {
        const newAnno = {
            ...affectedAnnotation, deleted: true
        }
        const deletedAnno = buildAnnotation(newAnno);
        setDeletedAnnotationList(deletedAnnotations.concat([deletedAnno]));
        // if(view) addHighlightsToEditor(annotationList.filter(a => a.id !== deletedAnno.id));
        return null;
    }
    return null;
    
}

// update textLength given autocomplete or comment?
export const userAutocompletedOrCommented = (changeText: string, textLength: number, rangeLength: number) : number => {
    const computedTabsize: number = typeof tabSize === 'number' ? tabSize : parseInt(tabSize);
		// USER DOES NOT ADD NEWLINES
		// checks for tab
    if(!insertSpaces && (changeText.match(/\t/g) || []).length === textLength) {
        // console.log('in not insertspaces if')
        textLength = textLength - rangeLength;
    }
    else if(insertSpaces && (((changeText.match(/\s/g) || []).length / computedTabsize ) * computedTabsize) === textLength) {
        // console.log('in insertspaces if')
        textLength = textLength - rangeLength;
    }
    
    // checks for autocomplete - tbh may be able to just do this check instead of the above 2
    else if(textLength && rangeLength) {
        textLength = textLength - rangeLength;
    }

    return textLength;
}

// determine how to update our anchor given change user made before beginning of anchor
export const userChangedTextBeforeStart = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, isDeleteOperation: boolean, textLength: number, rangeLength: number, anchorOnSameLine: boolean, changeHappenedOnBound: boolean) : Anchor => {
    const changeRangeOverlapsStart = originalAnchor.startOffset < changeRange.end.character && originalAnchor.startOffset > changeRange.start.character;

    // if user added text at the start offset, keep start offset
    if(changeHappenedOnBound && (!isDeleteOperation || (originalAnchor.startOffset - rangeLength < 0))) {
        newRange.startOffset = originalAnchor.startOffset;
    }
    // if user deleted text at the start offset and its a one line anchor, move start character back and move end offset back
    else if(changeHappenedOnBound && isDeleteOperation && changeRange.start.character === originalAnchor.startOffset && changeRange.end.character > originalAnchor.startOffset && anchorOnSameLine) {
        newRange.startOffset = changeRange.start.character;
        newRange.endOffset = originalAnchor.endOffset - rangeLength;
        return newRange;
    }
    // if user deleted and their deletion overlapped with our starting point of our anchor
    // move back start and optionally change end
    else if(changeRangeOverlapsStart && isDeleteOperation) {
        newRange.startOffset = changeRange.start.character;
        if(anchorOnSameLine) {
            newRange.endOffset = ((originalAnchor.endOffset - originalAnchor.startOffset) - (changeRange.end.character - originalAnchor.startOffset)) + changeRange.start.character;
        }
    }
    // simplest case - either remove length of deletion or add length of text 
    else {
        newRange.startOffset = isDeleteOperation ? originalAnchor.startOffset - rangeLength : originalAnchor.startOffset + textLength;
    }
    // do same thing for end
    if(anchorOnSameLine && !changeRangeOverlapsStart) {
        newRange.endOffset = isDeleteOperation ? originalAnchor.endOffset - rangeLength : originalAnchor.endOffset + textLength;
    } 
    
    return newRange;
}

// update end offset 
export const userChangedTextBeforeEnd = (newRange: Anchor, originalAnchor: Anchor, isDeleteOperation: boolean, textLength: number, rangeLength: number, changeRange: vscode.Range) : Anchor => {
    newRange.endOffset = isDeleteOperation ? // if delete
        originalAnchor.endOffset >= changeRange.end.character ? // and if the end of our anchor is past where the edit ends 
        originalAnchor.endOffset - rangeLength : // delete amount of code they deleted
        originalAnchor.endOffset - (originalAnchor.endOffset - changeRange.start.character) : // else remove the amount of code that was originally within our anchor point 
        originalAnchor.endOffset + textLength; // else it is not a delete so we add text length

    return newRange;
}

// user added newlines before the beginning of our anchor point
export const userChangedLinesBeforeStart = (newRange: Anchor, originalAnchor: Anchor, numLines: number) : Anchor => {
    newRange.startLine = originalAnchor.startLine + numLines;
    newRange.endLine = originalAnchor.endLine + numLines;
    return newRange;
}

// user did something in the middle of our anchor point
export const userChangedLinesInMiddle = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, numLines: number, anchorOnSameLine: boolean, anchorText: string, changeText: string, textLength: number, rangeLength: number, originalRange: vscode.Range) : Anchor => { 
    if(!anchorOnSameLine) {
        // change happened at the beginning of the anchor
        if(changeRange.start.line === originalAnchor.startLine) {
            console.log('userChangedLinesInMiddleUpdateStart')
            newRange = userChangedLinesInMiddleUpdateStart(newRange, originalAnchor, changeRange, numLines, anchorOnSameLine, anchorText, changeText, originalRange);
        }
        // change started at the end of the anchor
        else if(changeRange.start.line === originalAnchor.endLine && changeRange.start.character >= originalAnchor.endOffset) {
            console.log('userChangedLinesInMiddleUpdateEndUsingStart');
            newRange = userChangedLinesInMiddleUpdateEndUsingStart(newRange, originalAnchor, changeRange, numLines, changeText, anchorText);
        }
        // change ended at the end of the anchor
        else if(changeRange.end.line === originalAnchor.endLine && originalAnchor.endOffset >= changeRange.end.character) {
            console.log('userChangedLinesInMiddleUpdateEndUsingEnd');
            newRange = userChangedLinesInMiddleUpdateEndUsingEnd(newRange, changeRange, numLines, anchorText, originalAnchor, changeText, rangeLength);
        } 
        // our anchor fully encapsulates the change range but does not fit those other scenarios
        else if(createRangeFromObject(originalAnchor).contains(changeRange)) {
            newRange.endLine = originalAnchor.endLine + numLines;
        }
    }
    // one line anchor
    else {
        newRange = userChangedLinesInMiddleUpdateEndUsingEnd(newRange, changeRange, numLines, anchorText, originalAnchor, changeText, rangeLength);
    }
    
    return newRange;
}

const userChangedLinesInMiddleUpdateStart = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, numLines: number, anchorOnSameLine: boolean, anchorText: string, changeText: string, originalRange: vscode.Range) : Anchor => {
    // set new start line
    newRange.startLine = originalAnchor.startLine - numLines < 0 ? // error check
        0 : 
        changeRange.start.character <= originalAnchor.startOffset ? // if the change happened before or at the starting point
        originalAnchor.startLine + numLines : // move start line down
        originalAnchor.startLine; // else keep
	const relevantTextLength: number = changeText.substring(changeText.lastIndexOf('\n') + 1).replace('\n', '').replace('\r', '').length;
    const originalStart: number = newRange.startOffset, originalEnd: number = newRange.endOffset;
    newRange.startOffset = changeRange.start.character === originalStart ? relevantTextLength : (originalAnchor.startOffset - changeRange.start.character) + relevantTextLength;

    const anchorLength: number = originalEnd - originalStart;
    const doesAnchorIncludeNewline: boolean = anchorText.includes('\n');
    const doesChangeTextIncludeNewLine: boolean = changeText.includes('\n');
    if(originalRange.start.isEqual(changeRange.start) && originalRange.end.isBefore(changeRange.end) && !changeText.length) {
        newRange.startOffset = changeRange.end.character;
        newRange.startLine = changeRange.end.line;
        newRange.endLine = (originalRange.end.line - originalRange.start.line) + changeRange.end.line;
        newRange.endOffset = newRange.endOffset;
    }
    else if(doesAnchorIncludeNewline) {
        // console.log('anchor includes newline')
        const didChangeTurnMultilineAnchorIntoOneLine: boolean = (originalAnchor.endLine + numLines) === newRange.startLine; // we have already added/subtracted lines to endLine
        if(didChangeTurnMultilineAnchorIntoOneLine) {
            newRange.endOffset = changeRange.end.line === originalAnchor.endLine && changeRange.end.character < originalAnchor.endOffset ? changeRange.start.character + originalAnchor.endOffset : changeRange.start.character;
            newRange.endLine = changeRange.start.line;
        }
        else {
            newRange.endOffset = anchorText.substring(anchorText.lastIndexOf('\n') +  1).length; // this may need to be like the below check
            newRange.endLine = originalAnchor.endLine + numLines;
        }
    }
    else if(anchorOnSameLine && originalStart <= changeRange.start.character) {
        newRange.endOffset = doesChangeTextIncludeNewLine && (originalEnd > changeRange.start.character && originalStart < changeRange.start.character) ? (anchorLength - anchorText.substring(anchorLength - changeRange.start.character).length) + relevantTextLength : newRange.startOffset + anchorLength; 
        newRange.endLine = originalEnd > changeRange.start.character && doesChangeTextIncludeNewLine ? newRange.endLine + numLines : newRange.endLine;
    }
    else if(doesChangeTextIncludeNewLine && doesAnchorIncludeNewline && newRange.endLine === changeRange.start.line) {
        // console.log('update last line')
        const lastStr: string = anchorText.substring(anchorText.lastIndexOf('\n')) + 1;
        newRange.endOffset = lastStr.substring(lastStr.length - changeRange.start.character).length;
    }
    else if(doesChangeTextIncludeNewLine && anchorOnSameLine && changeRange.start.character <= originalStart) {
        // console.log('moving start to new line')
        newRange.startOffset = relevantTextLength + (originalStart - changeRange.start.character);
        newRange.endOffset = newRange.startOffset + anchorLength;
        newRange.endLine = newRange.endLine + numLines;
    }
   
    return newRange;
}

const userChangedLinesInMiddleUpdateEndUsingStart = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, numLines: number, changeText: string, anchorText: string) : Anchor => {
    if(numLines > 0) {
        const relevantTextLength = changeText.includes('\n') ? 
            changeText.substring(changeText.lastIndexOf('\n') + 1).length : 
            changeText.length; // originally had textLength - may need to swap with computed textlength
        // console.log('relevantTextLength', relevantTextLength, 'original text length', changeText.length);
        const pointAtWhichAnchorIsSplit: number = originalAnchor.endOffset - changeRange.start.character;
        const originalPositionEqualToEnd = new vscode.Position(originalAnchor.endLine, originalAnchor.endOffset).isEqual(changeRange.end);
        newRange.endOffset = originalPositionEqualToEnd ? changeRange.end.character :
                                anchorText.includes('\n') ? 
                                anchorText.substring(
                                    anchorText.lastIndexOf('\n')
                                ).length - 
                                anchorText.substring(
                                    anchorText.lastIndexOf('\n') + 1, anchorText.lastIndexOf('\n') + 1 + changeRange.start.character
                                ).length - 1 + relevantTextLength - 1 : 
                                pointAtWhichAnchorIsSplit + relevantTextLength - 1;
        // console.log('newRange.endOffset', newRange.endOffset);
    }

    return newRange;
}


const userChangedLinesInMiddleUpdateEndUsingEnd = (newRange: Anchor, changeRange: vscode.Range, numLines: number, anchorText: string, originalAnchor: Anchor, changeText: string, rangeLength: number) : Anchor => {
    if(numLines < 0) {
        const shrinkingIntoOneLineAnchor: boolean = originalAnchor.endLine + numLines === originalAnchor.startLine; 
        newRange.endOffset = anchorText.includes('\n') ? 
            shrinkingIntoOneLineAnchor ? 
            (originalAnchor.endOffset - changeRange.end.character) + changeRange.start.character + changeText.length : 
            anchorText.substring(anchorText.lastIndexOf('\n')).length - 1 + changeRange.start.character : 
            anchorText.substring(changeRange.start.character).length - 1;
        // if()
    }
    else if(numLines > 0 && changeRange.start.line === originalAnchor.endLine && changeRange.start.isEqual(changeRange.end)) {
        const addedTextCount: number = changeText.includes('\n') ? changeText.substring(changeText.lastIndexOf('\n') + 1).length : changeText.length;
        const originalEndOffset: number = originalAnchor.endOffset;
        newRange.endOffset = originalAnchor.endOffset - changeRange.start.character + addedTextCount;
        // console.log('original end offset', originalEndOffset, 'new end offset', newRange.endOffset);
        if(newRange.startLine === newRange.endLine && originalAnchor.startOffset >= changeRange.start.character) {
            newRange.startLine = originalAnchor.startLine + numLines;
            newRange.startOffset = newRange.endOffset - (originalEndOffset - originalAnchor.startOffset);
        }
    }
    newRange.endLine = originalAnchor.endLine + numLines;
    // console.log('new range', newRange);
    return newRange;
}

// probably need an equivalent for front of range?
export const shrinkOrExpandBackOfRange = (newRange: Anchor, changeRange: vscode.Range, numLines: number, changeText: string, anchorText: string, rangeLength: number, originalAnchor: Anchor, originalRange: vscode.Range) : Anchor => {
    if(numLines && !changeText.length && 
        (changeRange.start.isAfter(originalRange.start)) &&
        (changeRange.start.isBefore(originalRange.end)) &&
        changeRange.end.isAfter(originalRange.end)) {
        newRange.endLine = changeRange.start.line;
        newRange.endOffset = changeRange.start.character;    
    } 
    else if(numLines && changeText.length && 
        changeRange.start.isAfter(originalRange.start) &&
        changeRange.start.isBefore(originalRange.end) &&
        changeRange.end.isAfter(originalRange.end)
    ) 
    {
        newRange.endLine = changeRange.end.line;
        newRange.endOffset = changeRange.end.character;
    } 
    else if (numLines && !changeText.length && changeRange.start.isEqual(originalRange.end)) {
        newRange.endLine = originalRange.end.line;
        newRange.endOffset = originalRange.end.character;
    } 
    
    else {
        newRange.endLine = changeRange.start.line;
        newRange.endOffset = changeRange.start.character + newRange.endOffset;
    }

    return newRange;
}


export const shrinkOrExpandFrontOfRange = (newRange: Anchor, changeRange: vscode.Range, numLines: number, changeText: string, anchorText: string, rangeLength: number, originalStartLine: number, originalStartOffset: number) : Anchor => {
    const sameLineAnchor: boolean = !anchorText.includes('\n');
    if(numLines && !changeText.length) {
        const diff: number = sameLineAnchor ? newRange.endOffset - (changeRange.end.character - newRange.startOffset) : anchorText.substring(anchorText.lastIndexOf('\n')).length - (changeRange.end.character - newRange.startOffset); 
        const isOffsetBetweenChangeRangeEndAndAnnoStart = changeRange.end.line === originalStartLine && changeRange.end.character < originalStartOffset;
        newRange.endOffset = sameLineAnchor || newRange.startLine + numLines === newRange.endLine ? (changeRange.start.character + diff - newRange.startOffset) : newRange.endOffset;
        newRange.startLine = changeRange.start.line;
        newRange.startOffset =  (sameLineAnchor || newRange.startLine + numLines === newRange.endLine) && rangeLength > originalStartOffset && !isOffsetBetweenChangeRangeEndAndAnnoStart ? changeRange.start.character : changeRange.start.character + originalStartOffset - changeRange.end.character;
    } else if(numLines && changeText.length) {
        // selection range moving UP
        const isOffsetBetweenChangeRangeEndAndAnnoStart = changeRange.end.line === originalStartLine && changeRange.end.character < originalStartOffset
        const relevantTextLength: number = changeText.substring(changeText.lastIndexOf('\n') + 1).length;
        newRange.startLine = changeRange.start.line === originalStartLine && changeRange.start.character <= originalStartOffset ? changeRange.start.line + numLines : changeRange.start.line;
        newRange.startOffset = isOffsetBetweenChangeRangeEndAndAnnoStart ? changeRange.start.character + (originalStartOffset - changeRange.end.character) + changeText.length : changeRange.start.character;
        newRange.endOffset = sameLineAnchor ? newRange.startOffset + anchorText.length : newRange.endOffset;
        newRange.endLine = changeRange.start.line === originalStartLine && changeRange.start.character <= originalStartOffset ? newRange.startLine + numLines : newRange.endLine; 
    }

    return newRange;
}