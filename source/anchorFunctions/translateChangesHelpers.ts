import { tabSize, insertSpaces, view, annotationList, deletedAnnotations, setDeletedAnnotationList } from "../extension";
import { addHighlightsToEditor, createRangeFromObject } from "./anchor";
import Annotation, { Anchor } from '../constants/constants';
import { buildAnnotation } from '../utils/utils';
import * as vscode from 'vscode';


export const userDeletedAnchor = (originalAnnotation: Annotation) : Annotation => {
    const newAnno = {
        ...originalAnnotation, deleted: true
    }
    const deletedAnno = buildAnnotation(newAnno);
    setDeletedAnnotationList(deletedAnnotations.concat([deletedAnno]));
    if(view) addHighlightsToEditor(annotationList.filter(a => a.id !== deletedAnno.id));
    return deletedAnno;
}

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

export const userChangedTextBeforeStart = (newRange: Anchor, originalAnchor: Anchor, isDeleteOperation: boolean, textLength: number, rangeLength: number, anchorOnSameLine: boolean, changeHappenedOnBound: boolean) : Anchor => {
    // console.log('textLength', textLength, 'osl', originalStartOffset, 'rl', rangeLength);
    if(changeHappenedOnBound && (!isDeleteOperation || (originalAnchor.startOffset - rangeLength < 0))) {
        newRange.startOffset = originalAnchor.startOffset;
    }
    else {
        newRange.startOffset = isDeleteOperation ? originalAnchor.startOffset - rangeLength : originalAnchor.startOffset + textLength;
    }
    
    if(anchorOnSameLine) {
        newRange.endOffset = isDeleteOperation ? originalAnchor.endOffset - rangeLength : originalAnchor.endOffset + textLength;
    } 

    return newRange;
}

export const userChangedTextBeforeEnd = (newRange: Anchor, originalAnchor: Anchor, isDeleteOperation: boolean, textLength: number, rangeLength: number, changeRange: vscode.Range) : Anchor => {
    // console.log('user added text at end line - OEO', originalAnchor.endOffset, 'tl', textLength,'rl', rangeLength, 'isdl', isDeleteOperation);
    newRange.endOffset = isDeleteOperation ? originalAnchor.endOffset >= changeRange.end.character ? originalAnchor.endOffset - rangeLength : originalAnchor.endOffset - (originalAnchor.endOffset - changeRange.start.character) : originalAnchor.endOffset + textLength ;
    // console.log('newRange end Offset update', newRange.endOffset);
    return newRange;
}

export const userChangedLinesBeforeStart = (newRange: Anchor, originalAnchor: Anchor, numLines: number) : Anchor => {
    newRange.startLine = originalAnchor.startLine + numLines;
    newRange.endLine = originalAnchor.endLine + numLines;
    return newRange;
}

export const userChangedLinesInMiddle = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, numLines: number, anchorOnSameLine: boolean, anchorText: string, changeText: string, textLength: number) : Anchor => { 
    if(changeRange.start.line === originalAnchor.startLine) {
        console.log('userChangedLinesInMiddleUpdateStart')
        newRange = userChangedLinesInMiddleUpdateStart(newRange, originalAnchor, changeRange, numLines, anchorOnSameLine, anchorText, changeText);
    }
    else if(changeRange.start.line === originalAnchor.endLine && changeRange.start.character >= originalAnchor.endOffset) {
        console.log('userChangedLinesInMiddleUpdateEndUsingStart');
        newRange = userChangedLinesInMiddleUpdateEndUsingStart(newRange, originalAnchor, changeRange, numLines, changeText, anchorText);
    }
    else if(changeRange.end.line === originalAnchor.endLine && originalAnchor.endOffset >= changeRange.end.character) {
        console.log('userChangedLinesInMiddleUpdateEndUsingEnd');
        newRange = userChangedLinesInMiddleUpdateEndUsingEnd(newRange, changeRange, numLines, anchorText, originalAnchor, changeText);
    } 
    else if(createRangeFromObject(originalAnchor).contains(changeRange)) {
        newRange.endLine = originalAnchor.endLine + numLines;
    }

    // const newRangeRange = createRangeFromObject(originalAnchor);
    // if(newRangeRange.contains(changeRange))
    //     newRange.endLine = originalAnchor.endLine + numLines;
    return newRange;
}

const userChangedLinesInMiddleUpdateStart = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, numLines: number, anchorOnSameLine: boolean, anchorText: string, changeText: string) : Anchor => {
    newRange.startLine = originalAnchor.startLine - numLines < 0 ? 0 : changeRange.start.character <= originalAnchor.startOffset ? originalAnchor.startLine + numLines : originalAnchor.startLine;
	const relevantTextLength: number = changeText.replace('\n', '').replace('\r', '').length
    const originalStart: number = newRange.startOffset, originalEnd: number = newRange.endOffset;
    newRange.startOffset = changeRange.start.character === originalAnchor.startOffset ? relevantTextLength : originalAnchor.startOffset; // I feel like these should be swapped lol
    // if(anchorOnSameLine) {
    const anchorLength: number = originalEnd - originalStart;
    const doesAnchorIncludeNewline: boolean = anchorText.includes('\n');
    const doesChangeTextIncludeNewLine: boolean = changeText.includes('\n');
    if(doesAnchorIncludeNewline) {
        console.log('anchor includes newline')
        const didChangeTurnMultilineAnchorIntoOneLine: boolean = (originalAnchor.endLine + numLines) === newRange.startLine; // we have already added/subtracted lines to endLine
        if(didChangeTurnMultilineAnchorIntoOneLine) {
            console.log('turned multi into 1')
            newRange.endOffset = changeRange.end.line === originalAnchor.endLine && changeRange.end.character < originalAnchor.endOffset ? changeRange.start.character + originalAnchor.endOffset : changeRange.start.character;
            newRange.endLine = changeRange.start.line;
        }
        else {
            // console.log('didnt')
            newRange.endOffset = anchorText.substring(anchorText.lastIndexOf('\n')).length; // this may need to be like the below check
            newRange.endLine = originalAnchor.endLine + numLines;
        }
    }
    else if(anchorOnSameLine && originalStart <= changeRange.start.character) {

        console.log('anchor on same line', doesChangeTextIncludeNewLine && (originalEnd > changeRange.start.character && originalStart < changeRange.start.character));
        // console.log('startOffset', newRange.startOffset, 'anchor text length', anchorText.length);
        // console.log('anchorLength', anchorLength, 'anchorText', anchorText);
        // console.log('relevantTextLength', relevantTextLength);
        newRange.endOffset = doesChangeTextIncludeNewLine && (originalEnd > changeRange.start.character && originalStart < changeRange.start.character) ? (anchorLength - anchorText.substring(anchorLength - changeRange.start.character).length) + relevantTextLength : newRange.startOffset + anchorLength; 
        newRange.endLine = originalEnd > changeRange.start.character && doesChangeTextIncludeNewLine ? newRange.endLine + numLines : newRange.endLine;
    }
    else if(doesChangeTextIncludeNewLine && doesAnchorIncludeNewline && newRange.endLine === changeRange.start.line) {
        console.log('update last line')
        const lastStr: string = anchorText.substring(anchorText.lastIndexOf('\n'));
        newRange.endOffset = lastStr.substring(lastStr.length - changeRange.start.character).length;
    }
    else if(doesChangeTextIncludeNewLine && anchorOnSameLine && changeRange.start.character <= originalStart) {
        console.log('moving start to new line')
        newRange.startOffset = relevantTextLength + (originalStart - changeRange.start.character);
        newRange.endOffset = newRange.startOffset + anchorLength;
        newRange.endLine = newRange.endLine + numLines;
    }
   
    return newRange;
}

const userChangedLinesInMiddleUpdateEndUsingStart = (newRange: Anchor, originalAnchor: Anchor, changeRange: vscode.Range, numLines: number, changeText: string, anchorText: string) : Anchor => {
    if(numLines > 0) {
        const relevantTextLength = changeText.includes('\n') ? changeText.substring(changeText.lastIndexOf('\n')).length : changeText.length; // originally had textLength - may need to swap with computed textlength
        // console.log('relevantTextLength', relevantTextLength, 'original text length', changeText.length);
        const pointAtWhichAnchorIsSplit: number = originalAnchor.endOffset - changeRange.start.character;
        newRange.endOffset = anchorText.includes('\n') ? 
                                anchorText.substring(anchorText.lastIndexOf('\n')).length - anchorText.substring(anchorText.lastIndexOf('\n'), anchorText.lastIndexOf('\n') + changeRange.start.character).length - 1 + relevantTextLength - 1: 
                                pointAtWhichAnchorIsSplit + relevantTextLength - 1;
        // console.log('newRange.endOffset', newRange.endOffset);
    }

    return newRange;
}


const userChangedLinesInMiddleUpdateEndUsingEnd = (newRange: Anchor, changeRange: vscode.Range, numLines: number, anchorText: string, originalAnchor: Anchor, changeText: string) : Anchor => {
    // console.log('bool - numLines', numLines > 0, 'chanmgeRange', changeRange.start.line === originalAnchor.endLine, 'start end equal', changeRange.start.character === changeRange.end.character, changeRange.start.character, changeRange.end.character, changeRange)
    if(numLines < 0) {
        newRange.endOffset = changeRange.start.character + (anchorText.includes('\n') ? anchorText.substring(anchorText.lastIndexOf('\n')).length - 1 : anchorText.substring(changeRange.start.character).length - 1);
    }
    else if(numLines > 0 && changeRange.start.line === originalAnchor.endLine && changeRange.start.isEqual(changeRange.end)) {
        const addedTextCount: number = changeText.replace('\n', '').replace('\r', '').length;
        newRange.endOffset = originalAnchor.endOffset - changeRange.start.character + addedTextCount;
    }
    newRange.endLine = originalAnchor.endLine + numLines;
    return newRange;
}

// probably need an equivalent for front of range?
export const shrinkOrExpandBackOfRange = (newRange: Anchor, changeRange: vscode.Range, numLines: number, changeText: string, anchorText: string, rangeLength: number, originalAnchor: Anchor) : Anchor => {
    if(numLines && !changeText.length && (changeRange.start.character > originalAnchor.startOffset && changeRange.start.character < originalAnchor.endOffset )) {
        newRange.endLine = changeRange.start.line;
        newRange.endOffset = changeRange.start.character;
        console.log('shirnking back of Range');
// Didn't originally have these checks        
    } else if(numLines && changeText.length && (changeRange.start.character > originalAnchor.startOffset && changeRange.start.character < originalAnchor.endOffset )) {
        newRange.endLine = changeRange.end.line;
        newRange.endOffset = changeRange.end.character;
        console.log('expanding the range', newRange, changeRange)
    } 

    return newRange;
}

export const shrinkOrExpandFrontOfRange = (newRange: Anchor, changeRange: vscode.Range, numLines: number, changeText: string, anchorText: string, rangeLength: number, originalAnchor: Anchor) : Anchor => {
    const sameLineAnchor: boolean = !anchorText.includes('\n');
    if(numLines && !changeText.length) {
        const diff: number = sameLineAnchor ? newRange.endOffset - (changeRange.end.character - newRange.startOffset) : anchorText.substring(anchorText.lastIndexOf('\n')).length - (changeRange.end.character - newRange.startOffset); 
        // console.log('numLines', numLines, 'diff', diff, 'sameLineAnchor', sameLineAnchor);
        newRange.endOffset = sameLineAnchor || newRange.startLine + numLines === newRange.endLine ? (changeRange.start.character + diff - newRange.startOffset) : newRange.endOffset;
        newRange.startLine = changeRange.start.line;     
        newRange.startOffset =  (sameLineAnchor || newRange.startLine + numLines === newRange.endLine) && rangeLength > originalAnchor.startOffset ? changeRange.start.character : changeRange.start.character + originalAnchor.startOffset - changeRange.end.character;
        console.log('shrinkg front of range', newRange)
    } else if(numLines && changeText.length) {
        newRange.startLine = changeRange.start.line;
        newRange.startOffset = changeRange.start.character;
        newRange.endOffset = sameLineAnchor ? newRange.startOffset + anchorText.length : newRange.endOffset;
        console.log('expanding front of the range', newRange, changeRange)
    }

    return newRange;
}