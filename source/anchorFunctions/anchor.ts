import * as vscode from 'vscode';
import Annotation from '../constants/constants';
import { v4 as uuidv4 } from 'uuid';
import { buildAnnotation } from '../utils/utils';
import { annotationList, user, tabSize as userTabSize, deletedAnnotations, setDeletedAnnotationList, annotationDecorations } from '../extension';


function getIndicesOf(searchStr: string, str: string, caseSensitive: boolean) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}


export const getAnchorsInRange = (selection: vscode.Selection, annotationList: Annotation[]) : {[key: string] : any}[] => {
	const anchorsInSelection :  {[key: string] : any}[] = annotationList.map(a =>{ return { id: a.id, range: createRangeFromAnnotation(a) } }).filter(a => selection.contains(a.range));
	return anchorsInSelection;
}

const findBoundariesOfAnchor = (tokenizedText: string[], tokenizedSearchString: string[], startText: string, endText: string, broadSearch: boolean = false) : {[key: string] : any} => {
	let tokenStart: number = 0;
	let tokenEnd: number = 0;
	let startCondition: boolean = false;
	tokenizedText.forEach((t: string, index: number) => {
		startCondition = broadSearch ? t.includes(startText) : t === startText;
		if(startCondition) {
			let i = index;
			let j = 0;
			let endCondition: boolean = false;
			// ensure anchor text matches in its entirety
			while(tokenizedText[i] && tokenizedSearchString[j] && broadSearch ? tokenizedText[i].includes(tokenizedSearchString[j]) : tokenizedText[i] === tokenizedSearchString[j]) {
				endCondition = broadSearch ? tokenizedText[i].includes(endText) : tokenizedText[i] === endText;
				if(endCondition) {
					tokenStart = index;
					tokenEnd = i;
					break;
				}
				i++;
				j++;
			}
		}
	});

	return {
		tokenStart,
		tokenEnd
	};

}

const computeOffsets = (text: string, anchorStart: number, lastLineOfAnchor: string, anchorLength: number, rangeStart: number, areTokensSame: boolean) : {[key: string] : any}  => {
	let startOffset = 0;
	let endOffset = 0;
	let precedingLines = 0;
	let s = anchorStart;
	// if there is newlines in our change text and this is not a single line/inner anchor
	// walk backwards to find the last newline as that is the starting offset
	if(text.includes('\n') && !areTokensSame) {
		console.log('in compute offset if');
		if(!(s === 0 || text[s - 1] === '\n')) {
			while(text[s] && text[s] !== '\n') {
				s--;
			}
			startOffset = anchorStart - s;
		}
		endOffset = lastLineOfAnchor.length;
		precedingLines = (text.substring(0, anchorStart).match(/\n/g) || []).length;
	}
	// this is a single line change so the offset should just be the range start + the offset
	// we already computed
	else {
		startOffset = rangeStart + anchorStart; // need to add difference in length between this and changetext
		endOffset = startOffset + anchorLength;
	}

	return {
		startOffset,
		endOffset,
		precedingLines
	};
}

const findBestMatchInString = (candidateMatches: number[], anchorSlice: string[], text: string, len: number) : {[key: string] : any} => {
	let index: number = 0
	let stringStart = 0;
	let stringEnd = 0;
	// look at next word and see if it appears after one of our indices
	// -- repeat until all options are ruled out except one
	const candidateAnchors = candidateMatches.map((i: number) => {return { index: i, arr: text.substring(i, i + len).split(/\s+/g) }});
	// simple heuristic -- can we find one of these candidate matches that is the same length as our tokenized anchor?
	const checkIfWeFoundIt = candidateAnchors.filter((obj) => obj.arr.length === anchorSlice.length)
	// if so we're done

	if(checkIfWeFoundIt.length === 1) {
		stringStart = checkIfWeFoundIt[0].index;
		stringEnd = checkIfWeFoundIt[0].index + len;
		console.log('in check if we found len 1', checkIfWeFoundIt[0]);
	}
	// if not, iterate to find the best match
	else {
		let numMatches : number[] = [];
		// I'm 100000% sure there's a better way to do this LMAO
		candidateAnchors.forEach((obj: {[key: string] : any}) => {
			for(let i = 0; i < obj.arr.length; i++) {
				console.log('in foreach - obj', obj.arr[i], 'anchor', anchorSlice[i]);
				if(obj.arr[i] !== anchorSlice[i]) {
					numMatches.push(i);
					return;
				}
				// matched on every token - return
				else if(i === (obj.arr.length - 1)) {
					numMatches.push(obj.arr.length);
					return;
				}
			}
		});

		index = numMatches.indexOf(Math.max(...numMatches)) === -1 ? 0 : numMatches.indexOf(Math.max(...numMatches));
		stringStart = candidateAnchors[index].index;
		stringEnd = candidateAnchors[index].index + len;

	}

	return {
		stringStart,
		stringEnd
	};
}

// computes boundary points of each annotation's range given offsets or the changed text
export const findAnchorInRange = (range: vscode.Range | undefined, anchor: string, changeText: string, offsetData: {[key: string] : any}, originalRange: vscode.Range) : {[key: string] : any} => {
	// if this is a regular copy/cut/paste event, 
	// we should have the offsets from the copied range
	if(offsetData) {
		const newAnchor = {
			startLine: range?.start.line + offsetData.startLine,
			startOffset: range?.start.character + offsetData.startOffset, 
			endLine: range?.start.line + offsetData.endLine,
			endOffset: range?.end.character + offsetData.endOffset,
		}
	
		return newAnchor;
	}
	// if not, we use anchor text to try and find the best
	// candidate
	const tokenizedRange = changeText.split(/\s+/g);
	const tokenizedAnchorWhitespace = anchor.split(/\s+/g); 
	const cleanFrontAnchor = anchor.trimStart();
	const cleanBackAnchor = anchor.trimEnd();
	const tokenizedAnchor = cleanFrontAnchor.split(/\s+/g);
	const firstElOfAnchor = tokenizedAnchor[0];
	const tokenizedBackAnchor = cleanBackAnchor.split(/\s+/g);
	const lastEl = tokenizedBackAnchor[tokenizedBackAnchor.length - 1];

	// try and find start of our anchor
	let { tokenStart, tokenEnd } = findBoundariesOfAnchor(tokenizedRange, tokenizedAnchorWhitespace, firstElOfAnchor, lastEl, false);
	let startingToken = tokenStart, endingToken = tokenEnd;
	if(!startingToken && !endingToken) {
		const { tokenStart, tokenEnd} = findBoundariesOfAnchor(tokenizedRange, tokenizedAnchorWhitespace, firstElOfAnchor, lastEl, true);
		startingToken = tokenStart;
		endingToken = tokenEnd;
	}

	let anchorStartIndex: number = 0;
	let anchorEndIndex: number = 0;
	const anchorSlice = tokenizedRange.slice(startingToken, endingToken + 1);

	// get string to look for inside the inputted text - if tokenStart === tokenEnd that means we either never found a match
	// or the token is contained within a single piece of text in which case we just use the first element
	// of the anchor itself -- if not, we use whatever starting token the prior method found
	const searchString = startingToken === endingToken ? firstElOfAnchor : tokenizedRange[startingToken];
	
	// get list of indices in which the first token in our anchor appears (should at least have 1)
	const candidateMatches = getIndicesOf(searchString, changeText, true);
	
	// if we only have one match, that's our location
	if(candidateMatches.length === 1) {
		anchorStartIndex = candidateMatches[0];
		anchorEndIndex = candidateMatches[0] + anchor.length;
	}
	else if(candidateMatches.length > 1) {
		const { startString, endString } = findBestMatchInString(candidateMatches, anchorSlice, changeText, anchor.length);
		anchorStartIndex = startString;
		anchorEndIndex = endString;
	}
	// I don't think we ever actually go in here - maybe delete
	else {
		anchorStartIndex = changeText.indexOf(tokenizedRange[tokenStart]);
		anchorEndIndex = anchorStartIndex + anchor.length;
	}
	
	// get anchor text as it appears in the text
	const anchorTextInText : string = changeText.substring(anchorStartIndex, anchorEndIndex); // might not even need this ?
	const lastLineOfAnchor : string = anchorTextInText.includes('\n') ? anchorTextInText.substring(anchorTextInText.lastIndexOf('\n')) : anchorTextInText;
	const { startOffset, endOffset, precedingLines } = computeOffsets(changeText, anchorStartIndex, lastLineOfAnchor, anchor.length, range ? range.start.character : 0, startingToken === endingToken);

	const newAnchor = {
		startLine: range?.start.line + precedingLines,
		startOffset,
		endLine: range?.start.line + precedingLines + (anchor.match(/\n/g) || []).length,
		endOffset
	}

	return newAnchor;

}

export const translateChanges = (originalStartLine: number, originalEndLine: number, originalStartOffset: number, 
	originalEndOffset: number, startLine: number, endLine: number, startOffset: number, 
	endOffset: number, textLength: number, diff: number, rangeLength: number, 
	anchorText: string, annotation: string, filename: string, visiblePath: string, id: string, createdTimestamp: number, html: string, doc: vscode.TextDocument, changeText: string): Annotation => {
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };
		let newAnchorText = anchorText;
		// annotation anchor is no longer valid - for now, remove (should probably mark as out of date)
		if(doc.lineCount < originalEndLine || doc.lineCount < originalStartLine) {
			const newAnno = {
				id,
				filename,
				visiblePath,
				anchorText,
				annotation,
				...newRange,
				deleted: true,
				html,
				authorId : user?.uid,
				createdTimestamp: new Date().getTime(),
				programmingLang: filename.split('.')[1]
			}
			const deletedAnno = buildAnnotation(newAnno);
			addHighlightsToEditor(annotationList.filter(a => a.id !== deletedAnno.id));
			return deletedAnno;
		}
		
		
		const startAndEndLineAreSameNoNewLine = originalStartLine === startLine && originalEndLine === endLine && !diff;
		const startAndEndLineAreSameNewLine = originalStartLine === startLine && originalEndLine === endLine && diff;
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 

		// user deleted the anchor
		if(!textLength && changeRange.contains(originalRange)) {
			const newAnno = {
				id,
				filename,
				visiblePath,
				anchorText,
				annotation,
				...newRange,
				deleted: true,
				html,
				authorId : user?.uid,
				createdTimestamp: new Date().getTime(),
				programmingLang: filename.split('.')[1]
			}
			const deletedAnno = buildAnnotation(newAnno);
			setDeletedAnnotationList(deletedAnnotations.concat([deletedAnno]));
			addHighlightsToEditor(annotationList.filter(a => a.id !== deletedAnno.id));
			return deletedAnno;
		}

		let changeOccurredInRange : boolean = false;

		// user added lines above start of range
		if (startLine < originalStartLine && diff) {
			newRange.startLine = originalStartLine + diff;
			newRange.endLine = originalEndLine + diff;
		}

		// user adds/removes text at or before start of anchor on same line (no new lines)
		if(startOffset <= originalStartOffset && startLine === originalStartLine && !diff) {
			newRange.startOffset = textLength ? originalStartOffset + textLength : originalStartOffset - rangeLength;
			if(startAndEndLineAreSameNoNewLine) {
				newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			}
		}

		// user adds/removes text at or before the end offset (no new lines)
		if(endLine === originalEndLine && endOffset <= originalEndOffset && !diff) {
			newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			changeOccurredInRange = true;
		}

		// user added/removed line in middle of the anchor -- we are not including end offset
		if(startLine >= originalStartLine && endLine <= originalEndLine && endOffset < originalEndOffset && diff) {
			changeOccurredInRange = true;
			newRange.endLine = originalEndLine + diff;
			if(startLine === originalStartLine) {
				newRange.startLine = startOffset <= originalStartOffset ? originalStartLine + diff : originalStartLine;
				newRange.startOffset = startOffset <= originalStartOffset ? endOffset : originalStartOffset; // ?
				if(startAndEndLineAreSameNewLine) {
					newRange.endOffset = anchorText.includes('\n') ? anchorText.substring(anchorText.lastIndexOf('\n')).length : anchorText.substring(startOffset).length; // ???
				}
			}
		}

		// user added line before the end of the offset so we add a line
		// need to update anchor text
		if (originalEndLine === endLine && originalEndOffset >= endOffset && diff) {
			newRange.endLine = originalEndLine + diff;
			// user removed line -- start of new range should be at the end of our new range
			if(diff < 0) {
				newRange.endOffset = startOffset + originalEndOffset;
			}
			changeOccurredInRange = true;
		}

		if(changeOccurredInRange) {
			newAnchorText = doc.getText(createRangeFromObject(newRange));
		}



		const newAnno = {
			id,
			filename,
			visiblePath,
			anchorText: newAnchorText,
			annotation,
			...newRange,
			deleted: false,
			html,
			authorId : user?.uid,
			createdTimestamp,
			programmingLang: filename.split('.')[1]
		}

		// console.log('new anno', newAnno);
		return buildAnnotation(newAnno)

	}

export function createRangeFromAnnotation(annotation: Annotation) : vscode.Range {
	return new vscode.Range(new vscode.Position(annotation.startLine, annotation.startOffset), new vscode.Position(annotation.endLine, annotation.endOffset))
}

export function createRangeFromObject(obj: {[key: string] : any}) : vscode.Range {
	return new vscode.Range(obj.startLine, obj.startOffset, obj.endLine, obj.endOffset);
}

export const addHighlightsToEditor = (annotationList: Annotation[], text: vscode.TextEditor | undefined = undefined) : void => {
	const filenames = [... new Set(annotationList.map(a => a.filename))];
	const visibleEditors = vscode.window.visibleTextEditors.filter((t: vscode.TextEditor) => filenames.includes(t.document.uri.toString()));
	// we have one specific doc we want to highlight
	if(annotationList.length && text && filenames.includes(text.document.uri.toString())) {
		let ranges = annotationList
			.map(a => { return { id: a.id, annotation: a.annotation, filename: a.filename, range: createRangeFromAnnotation(a)}})
			.filter(r => r.filename === text?.document.uri.toString())
			.map(a => { return { id: a.id, annotation: a.annotation, range: a.range }});
		if(ranges.length) {
			const validRanges: {[key: string]: any}[] = [], invalidRanges: {[key: string]: any}[] = [];
			ranges.forEach((r: {[key: string ] : any}) => {
				if(text.document.validateRange(r.range).isEqual(r.range)) {
					validRanges.push(r);
				} else {
					invalidRanges.push(r);
				}
			});
			// do something with invalid ranges - do not highlight,
			// mark corresponding annos as out-of-date, 
			// possibly try to reattach given anchortext 
			try {
				const decorationOptions: vscode.DecorationOptions[] = validRanges.map(r => { return { range: r.range, hoverMessage: r.annotation } });
				text.setDecorations(annotationDecorations, decorationOptions);
			}
			catch (error) {
				console.log('couldnt highlight', error);
			}
		} 
	}

	// we want to highlight anything relevant
	else if(!text && visibleEditors.length) {
		const visFiles = visibleEditors.map((t: vscode.TextEditor) => t.document.uri.toString());
		const relevantAnnos = annotationList.filter((a: Annotation) => visFiles.includes(a.filename.toString()));
		const annoDecorationOptions: vscode.DecorationOptions[] = relevantAnnos.map((a: Annotation) => { return { hoverMessage: a.annotation, range: createRangeFromAnnotation(a) } });
		visibleEditors.forEach((v: vscode.TextEditor) => {
			v.setDecorations(annotationDecorations, annoDecorationOptions);
		});
	}

	// nothing
	else {
		// console.log('nothing to highlight');
	}
}