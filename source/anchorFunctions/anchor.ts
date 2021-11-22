import * as vscode from 'vscode';
import Annotation from '../constants/constants';
import { buildAnnotation, sortAnnotationsByLocation } from '../utils/utils';
import { annotationDecorations, setOutOfDateAnnotationList, view, setAnnotationList } from '../extension';
import { userDeletedAnchor, userAutocompletedOrCommented, userChangedTextBeforeStart, userChangedTextBeforeEnd, userChangedLinesBeforeStart, userChangedLinesInMiddle, shrinkOrExpandBackOfRange, shrinkOrExpandFrontOfRange } from './translateChangesHelpers';
import { AnchorHTMLAttributes } from 'react';

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

export const computeRangeFromOffset = (range: vscode.Range, offsetData: {[key: string] : any}) : {[key: string] : any} => {
	const newAnchor = {
		startLine: range?.start.line + offsetData.startLine,
		startOffset: range?.start.character + offsetData.startOffset, 
		endLine: range?.start.line + offsetData.endLine,
		endOffset: range?.end.character + offsetData.endOffset,
	}

	return newAnchor;
}

export const getAnchorsInRange = (selection: vscode.Selection, annotationList: Annotation[]) : {[key: string] : any}[] => {
	const anchorsInSelection :  {[key: string] : any}[] = annotationList.map(a =>{ return { id: a.id, range: createRangeFromAnnotation(a) } }).filter(a => selection.contains(a.range));
	return anchorsInSelection;
}

export const translateChanges = (
		originalAnnotation: Annotation,
		changeRange: vscode.Range, 
		textLength: number, 
		diff: number, 
		rangeLength: number, 
		doc: vscode.TextDocument, 
		changeText: string,
		)
	: Annotation => {
		const originalStartLine = originalAnnotation.startLine, originalEndLine = originalAnnotation.endLine, originalStartOffset = originalAnnotation.startOffset, originalEndOffset = originalAnnotation.endOffset;
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };	
		let originalAnchor = newRange;
		const { anchorText } = originalAnnotation;
		let newAnchorText = anchorText;
		const startAndEndLineAreSameNoNewLine = originalStartLine === changeRange.start.line && originalEndLine === changeRange.end.line && !diff;
		const startAndEndLineAreSameNewLine = originalStartLine === changeRange.start.line && originalEndLine === changeRange.end.line && (diff > 0 || diff < 0);
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		// const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 
		// user deleted the anchor

		// console.log('changeRange', changeRange, 'changeText', changeText, 'changetext len', changeText.length)
		const isDeleteOperation: boolean = !textLength;
		if(isDeleteOperation && changeRange.contains(originalRange)) {
			console.log('userDeletedAnchor');
			return userDeletedAnchor(originalAnnotation);
		}


		let changeOccurredInRange : boolean = false;
		textLength = userAutocompletedOrCommented(changeText, textLength, rangeLength);
		// user adds/removes text at or before start of anchor on same line (no new lines)
		if(changeRange.start.character <= originalStartOffset && changeRange.start.line === originalStartLine && !diff) {
			console.log('userChangedTextBeforeStart');
			newRange = userChangedTextBeforeStart(newRange, originalAnchor, isDeleteOperation, textLength, rangeLength, startAndEndLineAreSameNoNewLine, originalAnchor.startOffset === changeRange.start.character);
			if(originalAnchor.startOffset === changeRange.start.character) changeOccurredInRange = true;
		}

		// user adds/removes text at or before the end offset (no new lines)
		else if(changeRange.end.line === originalEndLine && (changeRange.end.character <= originalEndOffset || changeRange.start.character <= originalEndOffset) && !diff) {
			console.log('userChangedTextBeforeEnd');
			newRange = userChangedTextBeforeEnd(newRange, originalAnchor, isDeleteOperation, textLength, rangeLength, changeRange);
			changeOccurredInRange = true;
		}

		// USER ADDED OR REMOVED LINE

		// user added lines above start of range
		if (changeRange.start.line < originalStartLine && diff) {
			console.log('userChangedLinesBeforeStart');
			newRange = userChangedLinesBeforeStart(newRange, originalAnchor, diff);
		}

		// user added/removed line in middle of the anchor -- we are not including end offset
		if(changeRange.start.line >= originalStartLine && changeRange.end.line <= originalEndLine && diff) {
			changeOccurredInRange = true;
			console.log('userChangedLinesInMiddle');
			newRange = userChangedLinesInMiddle(newRange, originalAnchor, changeRange, diff, startAndEndLineAreSameNewLine, anchorText, changeText, textLength);
		}
		else if(changeRange.start.line >= originalStartLine && changeRange.start.line <= originalEndLine && changeRange.end.line >= originalEndLine && diff) {
			console.log('shrinkOrExpandBackOfRange');
			newRange = shrinkOrExpandBackOfRange(newRange, changeRange, diff, changeText, anchorText, rangeLength, originalAnchor);
		}
		else if(changeRange.end.line >= originalStartLine && changeRange.end.line <= originalEndLine && changeRange.start.line <=  originalEndLine && diff) {
			console.log('shrinkOrExpandFrontOfRange');
			newRange = shrinkOrExpandFrontOfRange(newRange, changeRange, diff, changeText, anchorText, rangeLength, originalAnchor);
		}

		if(newRange.endOffset === 0 || doc.getText(new vscode.Range(newRange.endLine, 0, newRange.endLine, newRange.endOffset)).replace(/\s/g, '').length === 0) {
			// may want to do this until we hit a line with text (e.g., while loop instead of just doing this check once)
			newRange.endLine = newRange.endLine - 1;
			newRange.endOffset = doc.getText(doc.validateRange(new vscode.Range(newRange.endLine, 0, newRange.endLine, 500))).length;
		}

		// user changed text somewhere inside the range - need to update text
		if(changeRange.start.line >= originalStartLine && changeRange.end.line <= originalEndLine && !diff) {
			changeOccurredInRange = true;
		}

		if(changeOccurredInRange) {
			newAnchorText = doc.getText(createRangeFromObject(newRange));
		}

		console.log('final range', newRange);

		const newAnno = {
			...originalAnnotation, anchorText: newAnchorText, ...newRange
		}

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
		let markdownArr = new Array<vscode.MarkdownString>();
		markdownArr.push(new vscode.MarkdownString(r.annotation));
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
				// console.log('hi', newAnnotationList);
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
		view?.updateDisplay(annotationList); // update that list is empty ? 
		text?.setDecorations(annotationDecorations, []);
	}
}

const test = (annotation: Annotation) : void => {
	console.log('hi'); 
}