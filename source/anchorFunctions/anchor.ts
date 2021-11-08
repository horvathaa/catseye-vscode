import * as vscode from 'vscode';
import Annotation from '../constants/constants';
import { buildAnnotation, sortAnnotationsByLocation, getFirstLineOfHtml, getProjectName } from '../utils/utils';
import { annotationList, user, deletedAnnotations, setDeletedAnnotationList, annotationDecorations, setOutOfDateAnnotationList, view, setAnnotationList } from '../extension';


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
		startLine: number, 
		endLine: number, 
		startOffset: number, 
		endOffset: number, 
		textLength: number, 
		diff: number, 
		rangeLength: number, 
		doc: vscode.TextDocument, 
		changeText: string,
		)
	: Annotation => {
		const originalStartLine = originalAnnotation.startLine, originalEndLine = originalAnnotation.endLine, originalStartOffset = originalAnnotation.startLine, originalEndOffset = originalAnnotation.endOffset;
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };


		const { anchorText } = originalAnnotation;
		let newAnchorText = anchorText;
		const startAndEndLineAreSameNoNewLine = originalStartLine === startLine && originalEndLine === endLine && !diff;
		const startAndEndLineAreSameNewLine = originalStartLine === startLine && originalEndLine === endLine && diff;
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 
		// user deleted the anchor
		if(!textLength && changeRange.contains(originalRange)) {
			const newAnno = {
				...originalAnnotation, deleted: true
			}
			const deletedAnno = buildAnnotation(newAnno);
			setDeletedAnnotationList(deletedAnnotations.concat([deletedAnno]));
			if(view) addHighlightsToEditor(annotationList.filter(a => a.id !== deletedAnno.id));
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