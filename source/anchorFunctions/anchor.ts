import * as vscode from 'vscode';
import Annotation from '../constants/constants';
import { v4 as uuidv4 } from 'uuid';
import { buildAnnotation } from '../utils/utils';
import { annotationList, setAnnotationList, user, view } from '../extension';
import * as utils from '../utils/utils';

export const getAnchorsInRange = (selection: vscode.Selection, annotationList: Annotation[]) : {[key: string] : any}[] => {
	return annotationList.map(a =>{ return { id: a.id, range: createRangeFromAnnotation(a) } }).filter(a => selection.contains(a.range));
}

// computes boundary points of each annotation's range given the pasted new range
export const splitRange = (range: vscode.Range, annotationList: Annotation[], filename: string, changeText: string) : Annotation[] => {
	let annoRanges = annotationList.map(a =>{ return {id: a.id, range: createRangeFromAnnotation(a), anchorText: a.anchorText }});
	// ensure first range in list is the beginning boundary range
	annoRanges = annoRanges.sort((a, b) => {
		return a.range.start.line - b.range.start.line;
	});

	annoRanges = annoRanges.map((a: any, index: number) => {
		let r = a.range;
		let numLines = r.end.line - r.start.line;
		let startOffset = r.start.character;
		let endOffset = r.end.character;
		const lastRange = index > 0 ? annoRanges[index - 1].range : r;
		const cleanAnchorText = a.anchorText.split(' ').join('');
		const cleanChangeText = changeText.split(' ').join('');
		const stringUntilAnchorText = cleanChangeText.substring(0, cleanChangeText.indexOf(cleanAnchorText));
		const numLinesBeforeAnchorStart = (stringUntilAnchorText.match(/\n/g) || []).length;
		// first range
		if(index === 0) {
			let newRange = { id: a.id, range: new vscode.Range(new vscode.Position(range.start.line + numLinesBeforeAnchorStart, range.start.character), new vscode.Position(range.start.line + numLines + numLinesBeforeAnchorStart, endOffset)), anchorText: a.anchorText};
			return newRange;
		}
		// last range
		else if(index === annoRanges.length - 1) {
			return {id: a.id, range: new vscode.Range(new vscode.Position(range.end.line - numLines,  startOffset), range.end), anchorText: a.anchorText};
		}
		// middle ranges
		else {
			return {id: a.id, range: new vscode.Range(
				new vscode.Position(lastRange?.end.line, lastRange?.end.character + startOffset), 
				new vscode.Position(lastRange?.end.line + numLines, endOffset)),
			anchorText: a.anchorText} 
			
		}
	});

	const rangeAdjustedAnnotations = annotationList.map(a => {
		const index = annoRanges.findIndex(r => r.id === a.id);
		const annoRange = annoRanges[index].range;
		return buildAnnotation(a, annoRange);
	});
	return rangeAdjustedAnnotations;

}

export const translateChanges = (originalStartLine: number, originalEndLine: number, originalStartOffset: number, 
	originalEndOffset: number, startLine: number, endLine: number, startOffset: number, 
	endOffset: number, textLength: number, diff: number, rangeLength: number, 
	anchorText: string, annotation: string, filename: string, visiblePath: string, id: string, createdTimestamp: number, html: string, doc: vscode.TextDocument): Annotation => {
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };
		const startAndEndLineAreSame = originalStartLine === startLine && originalEndLine === endLine && !diff;
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 
		// user deleted the anchor
		if(!textLength && changeRange.contains(originalRange)) {
			const newAnno = {
				id: uuidv4(),
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
			return buildAnnotation(newAnno);
		}

		let changeOccurredInRange : boolean = false;

		// user added lines above start of range
		if (originalStartLine > startLine && diff) {
			newRange.startLine = originalStartLine + diff;
			newRange.endLine = originalEndLine + diff;
		}
		 // user added line after start and before end
		 // need to update anchor text ?
		if (originalStartLine === startLine && originalStartOffset <= startOffset && diff) {
			newRange.endLine = originalEndLine + diff;
			changeOccurredInRange = true;
		}
		// user added line before the end of the offset so we add a line
		// need to update anchor text
		if (originalEndLine === endLine && originalEndOffset >= endOffset && diff) {
			newRange.endLine = originalEndLine + diff;
			changeOccurredInRange = true;
		}
		// user made change before our start offset
		if (originalStartLine === startLine && startOffset < originalStartOffset) {
			newRange.startOffset = textLength ? originalStartOffset + textLength : originalStartOffset - rangeLength;
			// if end is on the same line we need to update it too
			if(startAndEndLineAreSame) {
				newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			}
		}
		// user made change before or at our end offset -- need to update anchor text
		if(originalEndLine === endLine && endOffset <= originalEndOffset && !diff) {
			newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			changeOccurredInRange = true;
		}
		// user inserted text at our end offset () -- need to update anchor text
		if(originalEndLine === endLine && endOffset === (originalEndOffset + textLength) && !diff) {
			newRange.endOffset += textLength;
			changeOccurredInRange = true;
		}
		// user added lines between start and end (? not sure why we have this and the second condition)
		// need to update anchor text
		if(originalStartLine < startLine && endLine < originalEndLine && diff) {
			newRange.endLine = originalEndLine + diff;
			changeOccurredInRange = true;
		}

		// the edit happened within the anchor of the annotation
		// if(changeOccurredInRange) {
		// 	const newVscodeRange = new vscode.Range(new vscode.Position(newRange.startLine, newRange.startOffset), new vscode.Position(newRange.endLine, newRange.endOffset));
		// 	const newAnchorText = doc.getText(newVscodeRange);
		// 	utils.getShikiCodeHighlighting(filename, newAnchorText).then((newHtml: string) => {
		// 		const newAnno = {
		// 			id,
		// 			filename,
		// 			visiblePath,
		// 			anchorText: newAnchorText,
		// 			annotation,
		// 			...newRange,
		// 			deleted: false,
		// 			html: newHtml,
		// 			authorId : user?.uid,
		// 			createdTimestamp,
		// 			programmingLang: filename.split('.')[1]
		// 		}
		// 		view?.updateHtml(newHtml, newAnchorText, id);
		// 		const newAnnoObj : Annotation = buildAnnotation(newAnno);
		// 		setAnnotationList(annotationList.filter((a: Annotation) => a.id !== id).concat([newAnnoObj]));
		// 		return newAnnoObj;
		// 	})
			
		// }


		const newAnno = {
			id,
			filename,
			visiblePath,
			anchorText,
			annotation,
			...newRange,
			deleted: false,
			html,
			authorId : user?.uid,
			createdTimestamp,
			programmingLang: filename.split('.')[1]
		}
		return buildAnnotation(newAnno)

	}

// add line above range start = startLine++ and endLine++
// delete line above range start = startLine-- and endLine--
// add character(s) before range start on same line = startOffset++ (text length)
// delete character before range start on same line = startOffset-- (text length)
// add character before range end on same line = endOffset++ (text length)
// delete character before range end on same line = endOffset-- (text length)
// add line inbetween range start and range end = endLine++
// delete line inbetween range start and range end = endLine--
// add multiple characters inbetween start and end of range on same line = endOffset + text length
// delete multiple characters inbetween start and end of range on same line = endOffset - text length

export function createRangeFromAnnotation(annotation: Annotation) : vscode.Range {
	return new vscode.Range(new vscode.Position(annotation.startLine, annotation.startOffset), new vscode.Position(annotation.endLine, annotation.endOffset))
}
