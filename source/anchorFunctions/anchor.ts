import * as vscode from 'vscode';
import Annotation from '../constants/constants';
import { buildAnnotation, sortAnnotationsByLocation, getVisiblePath, getFirstLineOfHtml, getProjectName } from '../utils/utils';
import { annotationList, user, gitInfo, deletedAnnotations, setDeletedAnnotationList, annotationDecorations, setOutOfDateAnnotationList, view, setAnnotationList } from '../extension';


export function getIndicesOf(searchStr: string, str: string, caseSensitive: boolean) {
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
	}
	// if not, iterate to find the best match
	else {
		let numMatches : number[] = [];
		// I'm 100000% sure there's a better way to do this LMAO
		candidateAnchors.forEach((obj: {[key: string] : any}) => {
			for(let i = 0; i < obj.arr.length; i++) {
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
export const findAnchorInRange = (range: vscode.Range | undefined, anchor: string, changeText: string, offsetData: {[key: string] : any} | undefined, originalRange: vscode.Range) : {[key: string] : any} => {
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
	anchorText: string, annotation: string, filename: string, visiblePath: string, id: string, createdTimestamp: number, html: string, doc: vscode.TextDocument, changeText: string,
	annoGitData: {[key: string]: any}): Annotation => {
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };
		let newAnchorText = anchorText;

		const startAndEndLineAreSameNoNewLine = originalStartLine === startLine && originalEndLine === endLine && !diff;
		const startAndEndLineAreSameNewLine = originalStartLine === startLine && originalEndLine === endLine && diff;
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 
		// user deleted the anchor
		const projectName: string = annotationList.filter((a: Annotation) => a.id === id).length ? annotationList.filter((a: Annotation) => a.id === id)[0].projectName : ""
		const programmingLang: string = filename.split('.')[filename.split('.').length - 1];
		if(!textLength && changeRange.contains(originalRange)) {
			const firstLine: string = getFirstLineOfHtml(html, !newAnchorText.includes('\n'));
			const newAnno = {
				id,
				filename,
				visiblePath,
				anchorText,
				annotation,
				...newRange,
				deleted: true,
				outOfDate: false,
				html,
				authorId : user?.uid,
				createdTimestamp: new Date().getTime(),
				programmingLang: programmingLang,
				gitRepo: annoGitData?.repo ? annoGitData?.repo : "",
				gitBranch: annoGitData?.branch ? annoGitData?.branch : "",
				gitCommit: annoGitData?.commit ? annoGitData?.commit : "",
				anchorPreview: firstLine ? firstLine : "",
				projectName: projectName && projectName !== "" ? projectName : getProjectName(doc.uri.fsPath)
			}
			const deletedAnno = buildAnnotation(newAnno);
			setDeletedAnnotationList(deletedAnnotations.concat([deletedAnno]));
			addHighlightsToEditor(annotationList.filter(a => a.id !== deletedAnno.id));
			return deletedAnno;
		}

		let changeOccurredInRange : boolean = false;
		// USER DOES NOT ADD NEWLINES

		// console.log('changeRange', changeRange, 'originalRange', originalRange);
		// console.log('diff', diff);
		// console.log('changeText', changeText);
		// user adds/removes text at or before start of anchor on same line (no new lines)
		if(startOffset < originalStartOffset && startLine === originalStartLine && !diff) {
			newRange.startOffset = textLength ? originalStartOffset + textLength : originalStartOffset - rangeLength;
			// console.log('user added text at beginning line - OSO', originalStartOffset, 'so', startOffset, 'tl', textLength,'rl', rangeLength);
			if(startAndEndLineAreSameNoNewLine) {
				newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			}
			// console.log('new range start offset update', newRange.startOffset);
		}

		// user adds/removes text at or before the end offset (no new lines)
		if(endLine === originalEndLine && (endOffset <= originalEndOffset || startOffset <= originalEndOffset) && !diff) {
			// console.log('user added text at end line - OEO', originalEndOffset, 'eo', endOffset, 'tl', textLength,'rl', rangeLength);
			newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			// console.log('newRange end Offset update', newRange.endOffset);
			changeOccurredInRange = true;
		}

		// USER ADDED OR REMOVED LINE

		// user added lines above start of range
		if (startLine < originalStartLine && diff) {
			// console.log('in start line < originalStart line');
			newRange.startLine = originalStartLine + diff;
			newRange.endLine = originalEndLine + diff;
		}

		// user added/removed line in middle of the anchor -- we are not including end offset
		if(startLine >= originalStartLine && endLine <= originalEndLine && diff) {
			changeOccurredInRange = true;
			// console.log('updating in middle of range - sl', startLine, 'osl', originalStartLine, 'el', endLine, 'oel', originalEndLine, 'diff', diff);
			newRange.endLine = originalEndLine + diff;
			// console.log('updating endLine', newRange.endLine)
			if(startLine === originalStartLine) {
				newRange.startLine = startOffset <= originalStartOffset ? originalStartLine + diff : originalStartLine;
				// newRange.startOffset = startOffset < originalStartOffset ?  originalStartOffset : endOffset; // I feel like these should be swapped lol
				if(startAndEndLineAreSameNewLine) {
					newRange.endOffset = anchorText.includes('\n') ? anchorText.substring(anchorText.lastIndexOf('\n')).length : anchorText.substring(startOffset).length; // ???
				}
			}
			if(startLine === originalEndLine && originalEndOffset >= startOffset) {
				if(diff > 0) {
					const relevantTextLength = changeText.includes('\n') ? changeText.substring(changeText.lastIndexOf('\n')).length : textLength;
					// console.log('relevantTextLength', relevantTextLength, 'original text length', textLength);
					const pointAtWhichAnchorIsSplit: number = originalEndOffset - startOffset;
					newRange.endOffset = anchorText.includes('\n') ? 
											anchorText.substring(anchorText.lastIndexOf('\n')).length - anchorText.substring(anchorText.lastIndexOf('\n'), anchorText.lastIndexOf('\n') + startOffset).length - 1 + relevantTextLength - 1: 
											pointAtWhichAnchorIsSplit + relevantTextLength - 1;
					// console.log('newRange.endOffset', newRange.endOffset);
				} 
			}
			if(endLine === originalEndLine && originalEndOffset >= endOffset) {
				if(diff < 0) {
					newRange.endOffset = startOffset + (anchorText.includes('\n') ? anchorText.substring(anchorText.lastIndexOf('\n')).length - 1 : anchorText.substring(startOffset).length - 1);;
				}
			}
		}

		// user changed text somewhere inside the range - need to update text
		if(startLine >= originalStartLine && endLine <= originalEndLine && !diff) {
			changeOccurredInRange = true;
		}

		if(changeOccurredInRange) {
			newAnchorText = doc.getText(createRangeFromObject(newRange));
		}

		// console.log('newRange', newRange);
		let firstLine: string = getFirstLineOfHtml(html, !newAnchorText.includes('\n'));
		const newAnno = {
			id,
			filename,
			visiblePath,
			anchorText: newAnchorText,
			annotation,
			...newRange,
			deleted: false,
			outOfDate: false,
			html,
			authorId : user?.uid,
			createdTimestamp,
			programmingLang: programmingLang,
			gitRepo: annoGitData?.repo ? annoGitData?.repo : "",
			gitBranch: annoGitData?.branch ? annoGitData?.branch : "",
			gitCommit: annoGitData?.commit ? annoGitData?.commit : "",
			anchorPreview: firstLine ? firstLine : "",
			projectName: projectName && projectName !== "" ? projectName : getProjectName(doc.uri.fsPath)
		}
		// console.log('new Anno', newAnno);
		return buildAnnotation(newAnno)

	}

export function createRangeFromAnnotation(annotation: Annotation) : vscode.Range {
	return new vscode.Range(new vscode.Position(annotation.startLine, annotation.startOffset), new vscode.Position(annotation.endLine, annotation.endOffset))
}

export function createRangeFromObject(obj: {[key: string] : any}) : vscode.Range {
	return new vscode.Range(obj.startLine, obj.startOffset, obj.endLine, obj.endOffset);
}

const createDecorationOptions = (ranges: { [key: string] : any }[]) : vscode.DecorationOptions[] => {
	return ranges.map(r => {
		const annoContent: string = r.annotation === '' ? r.annotation : r.annotation + '  '; // add a new line so the show annotation button is below
		let markdownArr = new Array<vscode.MarkdownString>();
		markdownArr.push(new vscode.MarkdownString(annoContent));
		const showAnnoInWebviewCommand = vscode.Uri.parse(
			`command:adamite.showAnnoInWebview?${encodeURIComponent(JSON.stringify(r.id))}`
		);
		let showAnnoInWebviewLink: vscode.MarkdownString = new vscode.MarkdownString();
		showAnnoInWebviewLink.isTrusted = true;
		showAnnoInWebviewLink.appendMarkdown(`[Show Annotation](${showAnnoInWebviewCommand})`)
		markdownArr.push(showAnnoInWebviewLink);
		return { 
			range: r.range, 
			hoverMessage: markdownArr
		} 
	});
}

export const addHighlightsToEditor = (annotationList: Annotation[], text: vscode.TextEditor | undefined = undefined) : void => {
	const filenames = [... new Set(annotationList.map(a => a.filename))];
	const visibleEditors = vscode.window.visibleTextEditors.filter((t: vscode.TextEditor) => filenames.includes(t.document.uri.toString()));
	// we have one specific doc we want to highlight
	if(annotationList.length && text && filenames.includes(text.document.uri.toString())) {
		let ranges = annotationList
			.map(a => { return { id: a.id, anchorText: a.anchorText, annotation: a.annotation, filename: a.filename, range: createRangeFromAnnotation(a)}})
			.filter(r => r.filename === text?.document.uri.toString())
			.map(a => { return { id: a.id, anchorText: a.anchorText, annotation: a.annotation, range: a.range }});
		if(ranges.length) {
			const validRanges: {[key: string]: any}[] = [], invalidRanges: {[key: string]: any}[] = [];
			ranges.forEach((r: {[key: string ] : any}) => {
				const validRange: vscode.Range = text.document.validateRange(r.range);
				// range is already clean
				if(validRange.isEqual(r.range)) {
					r.range = validRange;
					validRanges.push(r);
				}
				// valid range is equivalent to original range so update range
				else if((text.document.getText(validRange) === (r.anchorText) && r.anchorText !== '')) {
					r.range = validRange;
					validRanges.push(r);
				}
				// valid range is not similar so we are screwed
				else {
					invalidRanges.push(r);
				}
			});

			const validIds: string[] = validRanges.map(r => r.id);
			const valid: Annotation[] = annotationList.filter((a: Annotation) => validIds.includes(a.id));
			valid.forEach((a: Annotation) => a.outOfDate = false);
			// bring back annotations that are not in the file
			const newAnnotationList : Annotation[] = sortAnnotationsByLocation(valid.concat(annotationList.filter(a => a.filename !== text?.document.uri.toString())), text.document.uri.toString());
			// console.log('sorted', newAnnotationList);
			setAnnotationList(newAnnotationList);
			try {
				const decorationOptions: vscode.DecorationOptions[] = createDecorationOptions(validRanges);
				text.setDecorations(annotationDecorations, decorationOptions);
			}
			catch (error) {
				console.log('couldnt highlight', error);
			}
			if(invalidRanges.length) {
				const invalidIds: string[] = invalidRanges.map(r => r.id);
				const ood: Annotation[] = annotationList.filter((a: Annotation) => invalidIds.includes(a.id))
				ood.forEach((a: Annotation) => a.outOfDate = true);
				setOutOfDateAnnotationList(ood);
			}
			if(vscode.workspace.workspaceFolders) {
				view?.updateDisplay(newAnnotationList);
			}
			
		} 
	}

	// we want to highlight anything relevant -- probably should do validity check here too
	// maybe extract validity check into a separate function
	else if(!text && visibleEditors.length && annotationList.length) {
		const filesToHighlight: {[key: string]: any} = {};
		const visFileNames: string[] = visibleEditors.map((t: vscode.TextEditor) => t.document.uri.toString());
		visFileNames.forEach((key: string) => {
			const annoRangeObjs: {[key: string]: any}[] = annotationList.filter((a: Annotation) => a.filename === key).map((a: Annotation) => { return { id: a.id, annotation: a.annotation, range: createRangeFromAnnotation(a) } })
			filesToHighlight[key] = createDecorationOptions(annoRangeObjs);
		});
		visibleEditors.forEach((v: vscode.TextEditor) => {
			v.setDecorations(annotationDecorations, filesToHighlight[v.document.uri.toString()]);
		});
	}

	// nothing
	else {
		// console.log('nothing to highlight');
		text?.setDecorations(annotationDecorations, []);
	}
}