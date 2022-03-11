import * as vscode from 'vscode';
import { Annotation, AnchorObject, Anchor } from '../constants/constants';
import { buildAnnotation, sortAnnotationsByLocation, getProjectName, getVisiblePath, getGithubUrl, getAnnotationsInFile, getAllAnnotationFilenames, getAnnotationsWithStableGitUrl, getAllAnnotationStableGitUrls, getAnnotationsNotInFile } from '../utils/utils';
import { annotationDecorations, setOutOfDateAnnotationList, view, annotationList, setAnnotationList, activeEditor } from '../extension';
import { userDeletedAnchor, userAutocompletedOrCommented, userChangedTextBeforeStart, userChangedTextBeforeEnd, userChangedLinesBeforeStart, userChangedLinesInMiddle, shrinkOrExpandBackOfRange, shrinkOrExpandFrontOfRange } from './translateChangesHelpers';

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

export const computeRangeFromOffset = (range: vscode.Range, offsetData: {[key: string] : any}) : Anchor => {
	const newAnchor = {
		startLine: range?.start.line + offsetData.startLine,
		startOffset: range?.start.character + offsetData.startOffset, 
		endLine: range?.start.line + offsetData.endLine,
		endOffset: range?.end.character + offsetData.endOffset,
	}

	return newAnchor;
}

export const createRangeFromAnchorObject = (anchor: AnchorObject) : vscode.Range => {
	return createRangeFromObject(anchor.anchor);
}

export const createAnchorFromRange = (range: vscode.Range) : Anchor => {
	return { startLine: range.start.line, startOffset: range.start.character, endLine: range.end.line, endOffset: range.end.character };
}

export const createAnchorFromPositions = (startPosition: vscode.Position, endPosition: vscode.Position) : Anchor => {
	return { startLine: startPosition.line, startOffset: startPosition.character, endLine: endPosition.line, endOffset: endPosition.character };
}

export const updateAnchorInAnchorObject = (id: string, annoId: string, anchor: Anchor) : AnchorObject[] => {
	const anno: Annotation | undefined = annotationList.find(a => a.id === annoId);
	const anchorObject: AnchorObject | undefined = anno?.anchors.find((a: AnchorObject) => a.anchorId === id);
	if(anno && anchorObject) return anno.anchors.filter((a: AnchorObject) => a.anchorId !== id).concat({ ...anchorObject, anchor });
	return []; // this sucks
}

export const getAnchorsInRange = (selection: vscode.Selection, annotationList: Annotation[]) : {[key: string] : any}[] => {
	const anchorsInSelection :  {[key: string] : any}[] = annotationList.flatMap(a => a.anchors).map((a: AnchorObject) => { 
		return { anchor: a, range: createRangeFromAnchorObject(a) } 
	}).filter(a => selection.contains(a.range));
	return anchorsInSelection;
}

export const getAnchorsInCurrentFile = (annotationList: Annotation[], currentFile?: string) : AnchorObject[] => {
	const annos: Annotation[] = currentFile ? getAnnotationsInFile(annotationList, currentFile) : annotationList;
	const anchors: AnchorObject[] = [];
	annos.forEach(a => {
		anchors.concat(a.anchors.filter((a: AnchorObject) => a.filename === currentFile));
	})
	return anchors;
}


export const translateChanges = (
		// originalAnnotation: Annotation,
		anchorObject: AnchorObject,
		changeRange: vscode.Range, 
		textLength: number, 
		diff: number, 
		rangeLength: number, 
		doc: vscode.TextDocument, 
		changeText: string,
		)
	: AnchorObject | null => {
		const originalStartLine = anchorObject.anchor.startLine, originalEndLine = anchorObject.anchor.endLine, originalStartOffset = anchorObject.anchor.startOffset, originalEndOffset = anchorObject.anchor.endOffset;
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };	
		// let originalAnchor = { ...newRange };
		// console.log("STARTING TRANSLATE CHANGES CALL");
		// console.log('originalAnchor', newRange);
		let originalAnchor = newRange;
		// console.log('originalAnchor at beginning of translate changes', originalAnchor);
		const { anchorText } = anchorObject;
		let newAnchorText = anchorText;
		const startAndEndLineAreSameNoNewLine = originalStartLine === changeRange.start.line && originalEndLine === changeRange.end.line && !diff;
		const startAndEndLineAreSameNewLine = originalStartLine === changeRange.start.line && originalEndLine === changeRange.end.line && (diff > 0 || diff < 0);
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		// const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 
		// user deleted the anchor

		// const editor = vscode.window.activeTextEditor;

		// console.log('changeRange', changeRange)
		const isDeleteOperation: boolean = !textLength;
		if(isDeleteOperation && changeRange.contains(originalRange)) {
			console.log('userDeletedAnchor');
			return userDeletedAnchor(anchorObject.parentId, anchorObject.anchorId);
		}

		if(!isDeleteOperation && changeRange.contains(originalRange)) {
			console.log('git Operation most likely...');

		}

		if(changeRange.start.isAfter(originalRange.end)) {
			return anchorObject;
		}
		

		 
		let changeOccurredInRange : boolean = false;
		textLength = userAutocompletedOrCommented(changeText, textLength, rangeLength);
		// user adds/removes text at or before start of anchor on same line (no new lines)
		if(changeRange.start.character <= originalStartOffset && changeRange.start.line === originalStartLine && !diff) {
			console.log('userChangedTextBeforeStart');
			newRange = userChangedTextBeforeStart(newRange, originalAnchor, changeRange, isDeleteOperation, textLength, rangeLength, startAndEndLineAreSameNoNewLine, originalAnchor.startOffset === changeRange.start.character);
			if(originalAnchor.startOffset === changeRange.start.character) changeOccurredInRange = true;
		}

		// user adds/removes text at or before the end offset (no new lines)
		else if(changeRange.end.line === originalEndLine && (changeRange.end.character <= originalEndOffset || changeRange.start.character <= originalEndOffset) && !diff) {
			console.log('userChangedTextBeforeEnd');
			newRange = userChangedTextBeforeEnd(newRange, originalAnchor, isDeleteOperation, textLength, rangeLength, changeRange);
			changeOccurredInRange = true;
		}

		// USER ADDED OR REMOVED LINE
		// console.log('originalAnchorCheck', originalAnchor);

		// user added lines above start of range
		if (changeRange.start.line < originalStartLine && diff) {
			console.log('userChangedLinesBeforeStart');
			newRange = userChangedLinesBeforeStart(newRange, originalAnchor, diff);
		}

		// console.log('originalAnchorCheck', originalAnchor);
		// user adds newline at beginning of anchor
		// if(originalRange.contains(changeRange)) {
		// 	newRange.startLine = originalStartLine;
		// 	newRange.endLine = newRange.endLine + diff;
		// }
		// else 
		if((changeRange.start.line === originalStartLine) && 
			diff && 
			(changeRange.start.character === originalStartOffset) && 
			(originalEndLine === originalStartLine)
		) {
			console.log('newLineAtStartOffset');
			newRange.startLine = changeRange.end.line + diff;
			newRange.endLine = changeRange.end.line + diff;
			newRange.startOffset = changeText.substring(changeText.lastIndexOf('\n') + 1).length + (originalStartOffset - changeRange.start.character);
			newRange.endOffset = newRange.startOffset + (originalEndOffset - originalStartOffset);
		}
		// user added/removed line in middle of the anchor -- we are not including end offset
		else if(changeRange.start.line >= originalStartLine && 
			changeRange.end.line <= originalEndLine && 
			diff && 
			changeRange.start.isAfterOrEqual(originalRange.start) &&
			changeRange.end.isBeforeOrEqual(originalRange.end)
		) {
			changeOccurredInRange = true;
			console.log('userChangedLinesInMiddle');
			newRange = userChangedLinesInMiddle(newRange, originalAnchor, changeRange, diff, startAndEndLineAreSameNewLine, anchorText, changeText, textLength, rangeLength, originalRange);
		}
		else if(changeRange.start.line >= originalStartLine && 
				changeRange.start.line <= originalEndLine && 
				changeRange.end.line >= originalEndLine && 
				diff) 
			{
			console.log('shrinkOrExpandBackOfRange');
			newRange = shrinkOrExpandBackOfRange(newRange, changeRange, diff, changeText, anchorText, rangeLength, originalAnchor, originalRange);
		}
		else if(changeRange.end.line >= originalStartLine && 
				changeRange.end.line <= originalEndLine && 
				changeRange.start.line <= originalEndLine && 
				diff) 
			{
			console.log('shrinkOrExpandFrontOfRange');
			// just pass in original start and original end here or osomething i dont even wanna deal with changing everything
			newRange = shrinkOrExpandFrontOfRange(newRange, changeRange, diff, changeText, anchorText, rangeLength, originalStartLine, originalStartOffset);
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

		const newAnchor: AnchorObject = {
			...anchorObject, anchorText: newAnchorText, anchor: newRange
		}

		return newAnchor

	}

export function createRangesFromAnnotation(annotation: Annotation) : vscode.Range[] {
	return annotation.anchors.flatMap((a: AnchorObject) => createRangeFromAnchorObject(a));
}

export function createRangeFromObject(obj: Anchor) : vscode.Range {
	return new vscode.Range(obj.startLine, obj.startOffset, obj.endLine, obj.endOffset);
}

const createDecorationOptions = (ranges: { [key: string] : any }[], annotationList: Annotation[]) : vscode.DecorationOptions[] => {
	return ranges.map(r => {
		let markdownArr = new Array<vscode.MarkdownString>();
		markdownArr.push(new vscode.MarkdownString(annotationList.find((a) => a.id === r.id)?.annotation));
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
	const filenames = getAllAnnotationFilenames(annotationList);
	const githubUrls = getAllAnnotationStableGitUrls(annotationList)
	const projectName = getProjectName(text?.document.uri.toString());
	const textUrl = text ? getGithubUrl(getVisiblePath(projectName, text?.document.uri.fsPath), projectName, true) : "";
	const visibleEditors = vscode.window.visibleTextEditors.filter((t: vscode.TextEditor) => filenames.includes(t.document.uri.toString()) || githubUrls.includes(textUrl));
	// we have one specific doc we want to highlight

	if(annotationList.length && text && (filenames.includes(text.document.uri.toString()) || githubUrls.includes(textUrl))) {
		let r: AnchorObject[] = annotationList.flatMap(a => a.anchors);
		let ranges = r
			.map(a => { return { id: a.parentId, anchorText: a.anchorText, filename: a.filename, range: createRangeFromAnchorObject(a)}})
			.filter(r => r.filename === text?.document.uri.toString())
			.map(a => { return { id: a.id, anchorText: a.anchorText, range: a.range }});
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
			const newAnnotationList : Annotation[] = sortAnnotationsByLocation(
				valid.concat(getAnnotationsNotInFile(annotationList, text.document.uri.toString())), 
				text.document.uri.toString()
			);

			setAnnotationList(newAnnotationList);
			try {
				const decorationOptions: vscode.DecorationOptions[] = createDecorationOptions(validRanges, annotationList);
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
		// console.log('in else if');
		const filesToHighlight: {[key: string]: any} = {};
		const visFileNames: string[] = visibleEditors.map((t: vscode.TextEditor) => t.document.uri.toString());
		const highlighted: string[] = [];
		visFileNames.forEach((key: string) => {
			const annotationsInCurrentFile = getAnnotationsInFile(annotationList, key);
			const annoRangeObjs: {[key: string]: any}[] = annotationsInCurrentFile
				.flatMap((a: Annotation) => { 
					highlighted.push(a.id);
					return a.anchors.flatMap(a => { return { id: a.parentId, range: createRangeFromAnchorObject(a) }})
				})
			filesToHighlight[key] = createDecorationOptions(annoRangeObjs, annotationList);
		});
		visibleEditors.forEach((v: vscode.TextEditor) => {
			v.setDecorations(annotationDecorations, filesToHighlight[v.document.uri.toString()]);
		});
	// }

	// else if(!visibleEditors.length && text && vscode.window.visibleTextEditors.length) {
		// may have a weird filename change on hand?
		if(highlighted.length !== annotationList.length) {
			const annotationsToHighlight = annotationList.filter(a => !highlighted.includes(a.id))
			const filesToHighlight2: {[key: string]: any} = {};
			const projectLevelAnnotationFiles: string[] = getAllAnnotationStableGitUrls(annotationsToHighlight);
			const projectLevelFileNames : string[] = vscode.window.visibleTextEditors.map((te: vscode.TextEditor) => {
				// console.log('doc', te.document.uri.fsPath, 'proj', getProjectName(te.document.uri.toString()))
				const projectName: string = getProjectName(te.document.uri.toString())
				return getGithubUrl(getVisiblePath(projectName, te.document.uri.fsPath), projectName, true);
			});

			// console.log('projectLevelAnnotationFiles', projectLevelAnnotationFiles)
			// it's a p rare situation where we actually need this highlighting so be conservative in invoking it
			// thru more robust checks
			if(!projectLevelFileNames || !projectLevelFileNames.length || !projectLevelFileNames.some(s => s.includes('github.com'))) {
				return;
			}
			projectLevelFileNames.forEach((filename: string) => {
				if(projectLevelAnnotationFiles.includes(filename)) {
					const annotationsWithStableUrl = getAnnotationsWithStableGitUrl(annotationsToHighlight, filename);
					const annoRangeObjs: {[key: string]: any}[] = annotationsWithStableUrl
						.flatMap((a: Annotation) => { return a.anchors.flatMap(a => { return { id: a.parentId, range: createRangeFromAnchorObject(a) }}) });
						filesToHighlight2[filename] = createDecorationOptions(annoRangeObjs, annotationsWithStableUrl); 
				}
			});
			vscode.window.visibleTextEditors.forEach((te: vscode.TextEditor) => {
				const projectName: string = getProjectName(te.document.uri.toString())
				const url = getGithubUrl(getVisiblePath(projectName, te.document.uri.fsPath), projectName, true)
				te.setDecorations(annotationDecorations, filesToHighlight2[url])
			});
		}
	}

	// nothing
	else {
		// console.log('nothing to highlight');
		view?.updateDisplay(annotationList); // update that list is empty ? 
		text?.setDecorations(annotationDecorations, []);
	}
}

const generateLineMetadata = (h: {[key: string]: any}) : {[key: string]: any}[] => {
	let linesAdded: {[key: string] : any}[] = [];
	let linesRemoved: {[key: string] : any}[] = [];
	let addRanges: {[key: string] : any}[] = [];
	let removeRanges: {[key: string] : any}[] = [];
	h.lines.forEach((l: string, index: number) => {
		const numLinesAddedAbove: number = h.lines.slice(0, index)
					.filter((s: string) => s[0] === '+').length + (h.newStartLine - h.oldStartLine);
		const numLinesRemovedAbove: number =  h.lines.slice(0, index)
				.filter((s: string) => s[0] === '-').length - (h.newStartLine - h.oldStartLine);
		const startLine = l[0] === '+' ? h.newStartLine : h.oldStartLine;
		const char = l[0] === '+' ? '-' : '+';
		const originalLineNumber: number = startLine + index - h.lines.slice(0, index)
				.filter((s: string) => s[0] === char).length;
		if(index - 1 >= 0 && h.lines[index - 1][0] === '+' && l[0] !== '+' && l[0] !== '-') {
			const localizedEndLine = h.newStartLine + (index - 1) - h.lines.slice(0, index - 1)
				.filter((s: string) => s[0] === '-').length
			console.log('addRanges', addRanges);
			let range = addRanges.filter((r: {[key: string]: any}) => !r.complete)[0] ? addRanges.filter((r: {[key: string]: any}) => !r.complete)[0] : { start: localizedEndLine, end: localizedEndLine, complete: true, hasCorrespondingRange: false };
			console.log('range???', range);
			range = { ...range, end: localizedEndLine, complete: true };
			addRanges = addRanges.filter((r: {[key: string]: any}) => r.complete).concat([range]);
		}
		else if(index - 1 >= 0 && h.lines[index - 1][0] === '-' && l[0] !== '+' && l[0] !== '-') {
			const localizedEndLine = h.oldStartLine + (index - 1) - h.lines.slice(0, index - 1)
			.filter((s: string) => s[0] === '+').length
			let range = removeRanges.filter((r: {[key: string]: any}) => !r.complete)[0] ? removeRanges.filter((r: {[key: string]: any}) => !r.complete)[0] : { start: localizedEndLine, end: localizedEndLine, complete: true, hasCorrespondingRange: false };
			console.log('range???', range);
			range = { ...range, end: localizedEndLine, complete: true };
			removeRanges = removeRanges.filter((r: {[key: string]: any}) => r.complete).concat([range]);
		}
		else if(l[0] === '+') {
			if(index - 1 >= 0 && h.lines[index - 1][0] !== '-' && h.lines[index - 1][0] !== '+') addRanges.push({ start: originalLineNumber, end: -1, complete: false, hasCorrespondingRange: false });
			if(index - 1 >= 0 && h.lines[index - 1][0] === '-') {
				console.log('in here');
				let range = removeRanges.filter((r: {[key: string]: any}) => !r.complete)[0];
				const localizedEndLine = h.oldStartLine + (index - 1) - h.lines.slice(0, index - 1)
					.filter((s: string) => s[0] === '+').length
				range = { ...range, end: localizedEndLine, complete: true, hasCorrespondingRange: true };
				removeRanges = removeRanges.filter((r: {[key: string]: any}) => r.complete).concat([range]);
				console.log('remove range', range);
				addRanges.push({ start: originalLineNumber, end: -1, complete: false, hasCorrespondingRange: true });
			}
			
			linesAdded.push(
				{ 
					line: l, 
					offsetInArray: index, 
					numLinesAddedAbove,
					numLinesRemovedAbove, 
					originalLineNumber,
					// translatedLineNumber: 
				} 
			);

		}

		else if(l[0] === '-') {
			if(index - 1 >= 0 && h.lines[index - 1][0] !== '-') removeRanges.push({ start: originalLineNumber, end: -1, complete: false, hasCorrespondingRange: false });
			// if(index - 1 >= 0 && h.lines[index - 1][0] === '+') {
			// 	let range = addRanges.filter((r: {[key: string]: any}) => !r.complete)[0];
			// 	range = { ...range, end: originalLineNumber, complete: true, hasCorrespondingRange: true };
			// 	addRanges = addRanges.filter((r: {[key: string]: any}) => r.complete).concat([range]);
			// }
			
			linesRemoved.push(
				{ 
					line: l, 
					offsetInArray: index, 
					numLinesAddedAbove,
					numLinesRemovedAbove, 
					originalLineNumber,
					// translatedLineNumber: 
				} 
			);
		}
	})

	console.log('linesadded', linesAdded, 'linesRemoved', linesRemoved, 'addRanges', addRanges, 'removeRanges', removeRanges);
	return linesAdded;
	
}



// // - is old, + is new - our old is origin/HEAD, our new is the user's local branch
// export const updateAnchorsUsingDiffData = (diffData: {[key: string]: any}, annotations: Annotation[]) : void => {
// 	// console.log('diffData in anchorts', diffData)
// 	// const filename: string = annotations[0].filename.toString();
// 	// let linesAddedInChunk
// 	diffData[0].hunks?.forEach((h: {[key: string]: any}) => {
// 		console.log('h', h);
// 		generateLineMetadata(h);
		
		// const hunkRange: vscode.Range = new vscode.Range(new vscode.Position(h.newStartLine, 0), new vscode.Position(h.newStartLine + h.newLineCount + 1, 0));
		// console.log('hunkRange', hunkRange);
		// console.log('annotations', annotations);
		
		// const annosAffectedByChange: Annotation[] = annotations.filter(a => createRangesFromAnnotation(a).contains(hunkRange))
		// need to also add/subtract diff for annos that have changes that were made above the start of their anchor
		// console.log('annos', annosAffectedByChange);
		// annotations.forEach((a: Annotation) => {
		// 	// user replaced original line
		// 	console.log('a before change', a);
		// 	let startLine: number = a.startLine;
		// 	let endLine: number = a.endLine; 
		// 	let startOffset: number = a.startOffset;
		// 	let endOffset: number = a.endOffset;
		// 	const relevantLinesAdded: {[key: string]: any}[] = h.lines
		// 														.map((l: string, index: number) => { 
		// 															if(l[0] === '+') 
		// 															return { 
		// 																line: l, 
		// 																offsetInArray: index, 
		// 																numLinesAddedAbove: 
		// 																	h.lines.slice(0, index)
		// 																			.filter((s: string) => s[0] === '+')
		// 																			.length, 
		// 																numLinesRemovedAbove: 
		// 																	h.lines.slice(0, index)
		// 																			.filter((s: string) => s[0] === '-').length, 
		// 																originalLineNumber: 
		// 																	h.newStartLine + index - h.lines.slice(0, index)
		// 																									.filter((s: string) => s[0] === '-').length 
		// 																} 
		// 														})
		// 														.filter((l: {[key: string]: any} | undefined) => l !== undefined );
		// 	const relevantLinesRemoved: {[key: string]: any}[] = h.lines
		// 														    .map((l: string, index: number) => { 
		// 															  if(l[0] === '-') {
		// 																const numLinesAddedAbove: number = h.lines.slice(0, index)
		// 																										.filter((s: string) => s[0] === '+').length + (h.newStartLine - h.oldStartLine);
		// 																const numLinesRemovedAbove: number =  h.lines.slice(0, index)
		// 																										.filter((s: string) => s[0] === '-').length - (h.newStartLine - h.oldStartLine);
		// 																return { 
		// 																	line: l, 
		// 																	offsetInArray: index, 
		// 																	numLinesAddedAbove,
		// 																	numLinesRemovedAbove, 
		// 																	originalLineNumber: h.oldStartLine + index - h.lines.slice(0, index)
		// 																														  .filter((s: string) => s[0] === '+').length,
		// 																	// translatedLineNumber: 
		// 																  } 
		// 															  }
																	  
		// 															})
		// 															.filter((l: {[key: string]: any} | undefined) => l !== undefined );
		// 	const linesAddedInAnchorRange = relevantLinesAdded.filter((l) => {
		// 		// console.log('l', l, 'a', a);
		// 		return (a.startLine < l.originalLineNumber) && (a.endLine > l.originalLineNumber)
		// 	});
		// 	const linesRemovedInAnchorRange = relevantLinesRemoved.filter((l) => (a.startLine < h.newStartLine + l.offsetInArray) && (a.endLine > h.newLineCount + l.offsetInArray));
		// 	// let linesAddedHunk: number = relevantLinesAdded.length;
		// 	// let linesRemovedHunk: number = relevantLinesRemoved.length;

		// 	console.log('linesAddedInAnchorRange', linesAddedInAnchorRange);
		// 	console.log('linesRemoved', linesRemovedInAnchorRange);
		// 	console.log('relevantLinesAdded', relevantLinesAdded, 'relevantLinesRemoved', relevantLinesRemoved)
		// 	const rangeStart: number = h.newStartLine // + rangeStartOffset;
		// 	const rangeEnd: number = h.newStartLine // + rangeEndOffset;
		// 	console.log('rangeStart', rangeStart, 'rangeEnd', rangeEnd);

		// 	if(a.startLine < rangeStart && a.startLine < rangeEnd && a.endLine < rangeStart && a.endLine < rangeEnd) {
		// 		console.log('a is above changes and wont be affected');
		// 		return;
// 		// 	}

// 			// else if(h.oldStartLine === h.newStartLine && h.oldLineCount === h.newLineCount) {
// 			// 	// if the 
// 			// 	// changed line is the start or end line, in which case we may need to change the offsets
// 			// 	console.log('old start old end new start new end all equal');
// 			// 	const startOrEndLines: {[key: string]: any}[] = relevantLinesRemoved.filter((l: {[key: string]: any}) => {
// 			// 		if(l.offsetInArray + h.oldStartLine === a.startLine || l.offsetInArray + h.oldStartLine === a.endLine) {
// 			// 			return { ...l, updateStart: l.offsetInArray + h.oldStartLine === a.startLine };
// 			// 		}
// 			// 	});
// 			// 	if(startOrEndLines.length) {
// 			// 		let offsetDiff = startOrEndLines[0].line.length - h.lines[startOrEndLines[0].offsetInArray + 1].length;
// 			// 		if(startOrEndLines[0].updateStart) {
// 			// 			const computedOffset: number = a.startOffset + offsetDiff >= 0 ? a.startOffset + offsetDiff : 0;
// 			// 			startOffset = computedOffset
// 			// 		} else {
// 			// 			const computedOffset: number = a.endOffset + offsetDiff >= 0 ? a.endOffset + offsetDiff : 0;
// 			// 			endOffset = computedOffset;
// 			// 		}
// 			// 	}

// 			// }
// 			// // user added lines
// 			// else if(h.newLineCount > h.oldLineCount) {
// 			// 	console.log('new line count greater than old');
// 			// 	const diff = (h.newStartLine - h.oldStartLine) + (linesAddedHunk - linesRemovedHunk);
// 			// 	const innerAnchorDiff = (h.newStartLine - h.oldStartLine) + (linesAddedInAnchorRange.length - linesRemovedInAnchorRange.length) 
// 			// 	console.log('diff', diff, 'linesadded', linesAddedHunk, 'linesRemoved', linesRemovedHunk);
// 			// 	if(a.startLine > rangeStart && a.startLine > rangeEnd) {
// 			// 		console.log('change happened above anchor');
// 			// 		startLine = a.startLine - diff;
// 			// 		endLine = a.endLine - diff;
// 			// 	}
// 			// 	else if (rangeStart < a.startLine && rangeEnd > a.endLine) {
// 			// 		console.log("RANGE START RANGE END!!!!!!!!!!!!!")
// 			// 		const rangeOfChange = [(h.newLineCount - h.oldLineCount) + h.newLineStart - linesRemovedHunk, h.newLineCount + h.newLineStart - linesRemovedHunk]; // 17
// 			// 		const addedLines: number[] = relevantLinesAdded.map((a: {[key: string]: any}) => h.newStartLine - linesRemovedHunk + a.offsetInArray);
// 			// 		console.log('addedLines??', addedLines);
// 			// 		let startLineIndex: {[key: string]: any} = { key: "", index: -1, lineNumber: -1 };
// 			// 		let endLineIndex: {[key: string]: any} = { key: "", index: -1, lineNumber: -1 };
// 			// 		let addedChunks: {[key: string]: any};
// 			// 		if(addedLines.length) {
// 			// 			addedChunks = { 'section 1': [] };
// 			// 			let i = 1;
// 			// 			addedLines.forEach((line, index) => {
// 			// 				if(index && (line - 1) !== addedLines[index - 1]) {
// 			// 					i++;
// 			// 					addedChunks['section ' + i] = [];
// 			// 				}
// 			// 				addedChunks['section ' + i].push(line);
// 			// 			});
// 			// 			console.log('addedChunks', addedChunks);
// 			// 			if(addedLines.includes(a.startLine)) {
// 			// 				for(let key in addedChunks) {
// 			// 					if(addedChunks[key].includes(a.startLine)) {
// 			// 						startLineIndex = { index: addedChunks[key].indexOf(a.startLine), key, lineNumber: a.startLine };
// 			// 					}
// 			// 				}
// 			// 			}
// 			// 			if(addedLines.includes(a.endLine)) {
// 			// 				for(let key in addedChunks) {
// 			// 					if(addedChunks[key].includes(a.endLine)) {
// 			// 						endLineIndex = { index: addedChunks[key].indexOf(a.endLine), key, lineNumber: a.endLine };
// 			// 					}
// 			// 				}
// 			// 			}
// 			// 		}
// 			// 		const removedLines: number[] = relevantLinesRemoved.map((a: {[key: string]: any}) => h.newStartLine - linesRemovedHunk + a.offsetInArray);
// 			// 		console.log('removedLines??', removedLines);
// 			// 		let removedChunks: {[key: string]: any};
// 			// 		if(removedLines.length) {
// 			// 			removedChunks = { 'section 1': [] };
// 			// 			let i = 1;
// 			// 			removedLines.forEach((line, index) => {
// 			// 				if(index && (line - 1) !== removedLines[index - 1]) {
// 			// 					i++;
// 			// 					removedChunks['section ' + i] = [];
// 			// 				}
// 			// 				removedChunks['section ' + i].push(line);
// 			// 			});
// 			// 			console.log('removedChunks', removedChunks);
// 			// 			console.log('startLineIndex', startLineIndex, 'endLineIndex', endLineIndex);
// 			// 			if(startLineIndex.index !== -1 && removedChunks[startLineIndex.key] && removedChunks[startLineIndex.key].length) {
// 			// 				startLine = removedChunks[startLineIndex.key][startLineIndex.index];
// 			// 				console.log('START LINE!!!!!!!!!!!!!!!', startLine);
// 			// 			}
// 			// 		}
					
// 			// 		if(a.startLine >= rangeOfChange[0] && a.endLine <= rangeOfChange[1]) {
// 			// 			console.log('anno is only in new change -- mark as outOfDate or something and dont update anchor');
// 			// 			return;
// 			// 		}
// 			// 	}
// 			// 	else{
// 			// 		console.log('change happened within anchor - inner diff', innerAnchorDiff);
// 			// 		endLine = a.endLine - innerAnchorDiff;
// 			// 	}
// 			// }
// 			// else if(h.oldLineCount > h.newLineCount) {
// 			// 	console.log('old line count greater than new')

// 			// 	// const rangeOfChange: vscode.Range = new vscode.Range()
// 			// 	const innerAnchorDiff = (h.newStartLine - h.oldStartLine) + (linesAddedInAnchorRange.length - linesRemovedInAnchorRange.length) 
// 			// 	const diff = (h.newStartLine - h.oldStartLine) + (linesAddedHunk - linesRemovedHunk);
// 			// 	console.log('diff', diff, 'linesadded', linesAddedHunk, 'linesRemoved', linesRemovedHunk);
// 			// 	if(a.startLine > rangeStart && a.startLine > rangeEnd) {
// 			// 		startLine = a.startLine + diff;
// 			// 		endLine = a.endLine + diff; 
// 			// 	}
// 			// 	// change encompasses range
// 			// 	else if (rangeStart < a.startLine && rangeEnd > a.endLine) {
// 			// 		// console.log('range includes anchor')
// 			// 		// let diffAboveAnchor = 0;
// 			// 		// let diffWithinAnchor = 0;
// 			// 		// for(let chunk in removedChunks) {
// 			// 		// 	const normalizedLineArray = removedChunks[chunk].map((n: number) => n + (h.newStartLine - h.oldStartLine))
// 			// 		// 	if(normalizedLineArray.includes(a.startLine)) {
// 			// 		// 		startLine = normalizedLineArray.filter((n: number) => n - (h.newStartLine - h.oldStartLine) === a.startLine)[0] - (h.newStartLine - h.oldStartLine);
// 			// 		// 		if(chunk !== 'section 1') {
// 			// 		// 			let chunkNum = parseInt(chunk[chunk.length - 1]);
// 			// 		// 			while(chunkNum !== 1) {
// 			// 		// 				startLine += removedChunks['section ' + chunkNum].length - addedChunks['section ' + chunkNum] ? addedChunks['section ' + chunkNum].length : 0;
// 			// 		// 				chunkNum--;
// 			// 		// 			}
// 			// 		// 		}
// 			// 		// 		console.log('wow... Code', startLine);
// 			// 		// 	}
// 			// 		// }
// 			// 		// removedChunks.forEach((l: {[key: string]: any}) => { // 43 - 58 [newStartLine, newStartLine + newLineCount + (oldLineCount-newLineCount) - (oldStartLine - newStartLine)]
// 			// 		// 	const normalizedLineNumber = l.offsetInArray + (h.oldLineCount - h.newLineCount) + h.newStartLine - linesRemovedHunk;
// 			// 		// 	console.log('NORMALLLL', normalizedLineNumber);
// 			// 		// 	if(normalizedLineNumber > a.startLine) 	diffAboveAnchor++;
// 			// 		// 	else if(a.startLine < normalizedLineNumber && a.endLine > normalizedLineNumber) diffWithinAnchor++;
// 			// 		// });
// 			// 		// console.log('diffAbove', diffAboveAnchor,'difWithin', diffWithinAnchor);
// 			// 		// startLine = a.startLine + diffAboveAnchor;
// 			// 		// endLine = a.endLine + diffAboveAnchor + diffWithinAnchor;

// 			// 	}
// 			// 	else {
// 			// 		endLine = a.endLine + innerAnchorDiff;
// 			// 	}
				
// 			// }
// 			// else {
// 			// 	console.log('uh oh', h);
// 			// }
// 			console.log('newStartLine', startLine, 'newEndLine', endLine, 'newStartOffset', startOffset, 'newEndOffset', endOffset);
// 		})
// 	});
// }




// // const addedLines: number[] = relevantLinesAdded.map((a: {[key: string]: any}) => h.newStartLine - linesRemovedHunk + a.offsetInArray);
// // console.log('addedLines??', addedLines);
// // let startLineIndex: {[key: string]: any} = { key: "", index: -1, lineNumber: -1 };
// // let endLineIndex: {[key: string]: any} = { key: "", index: -1, lineNumber: -1 };
// // let addedChunks: {[key: string]: any} = {};
// // if(addedLines.length) {
// // 	addedChunks = { 'section 1': [] };
// // 	let i = 1;
// // 	addedLines.forEach((line, index) => {
// // 		if(index && (line - 1) !== addedLines[index - 1]) {
// // 			i++;
// // 			addedChunks['section ' + i] = [];
// // 		}
// // 		addedChunks['section ' + i].push(line);
// // 	});
// // }

// // const removedLines: number[] = relevantLinesRemoved.map((a: {[key: string]: any}) => h.newStartLine - linesRemovedHunk + a.offsetInArray);
// // console.log('removedLines??', removedLines);
// // let removedChunks: {[key: string]: any} = {};
// // if(removedLines.length) {
// // 	removedChunks = { 'section 1': [] };
// // 	let i = 1;
// // 	removedLines.forEach((line, index) => {
// // 		if(index && (line - 1) !== removedLines[index - 1]) {
// // 			i++;
// // 			removedChunks['section ' + i] = [];
// // 		}
// // 		removedChunks['section ' + i].push(line);
// // 	});
// // 	console.log('removedChunks', removedChunks);

// // }
// // console.log('in here')
// // console.log('cond1', h.oldStartLine === h.newStartLine && h.oldLineCount === h.newLineCount, 'cond2', h.newLineCount > h.oldLineCount, 'cond3', h.oldLineCount > h.newLineCount)

// // const rangeStartOffset: number = linesAddedHunk && linesRemovedHunk ? Math.min(relevantLinesAdded[0].offsetInArray, relevantLinesRemoved[0].offsetInArray) : linesAddedHunk ? relevantLinesAdded[0].offsetInArray : relevantLinesRemoved[0].offsetInArray;
// // // const rangeEndOffset: number = linesAddedHunk && linesRemovedHunk ? Math.max(relevantLinesAdded[linesAddedHunk - 1].offsetInArray, relevantLinesRemoved[linesRemovedHunk - 1].offsetInArray) : linesAddedHunk ? relevantLinesAdded[linesAddedHunk - 1].offsetInArray : relevantLinesRemoved[linesRemovedHunk - 1].offsetInArray

// // const relevantLinesAdded: {[key: string]: any}[] = h.lines
// // 																.map((l: string, index: number) => { 
// // 																	if(l[0] === '+') 
// // 																	return { 
// // 																		line: l, 
// // 																		offsetInArray: index, 
// // 																		numLinesAddedAbove: 
// // 																			h.lines.slice(0, index)
// // 																					.filter((s: string) => s[0] === '+')
// // 																					.length, 
// // 																		numLinesRemovedAbove: 
// // 																			h.lines.slice(0, index)
// // 																					.filter((s: string) => s[0] === '-').length, 
// // 																		originalLineNumber: 
// // 																			h.newStartLine + index - h.lines.slice(0, index)
// // 																											.filter((s: string) => s[0] === '-').length 
// // 																		} 
// // 																})
// // 																.filter((l: {[key: string]: any} | undefined) => l !== undefined );
// // 			const relevantLinesRemoved: {[key: string]: any}[] = h.lines
// // 																    .map((l: string, index: number) => { 
// // 																	  if(l[0] === '-') {
// // 																		const numLinesAddedAbove: number = h.lines.slice(0, index)
// // 																												.filter((s: string) => s[0] === '+').length + (h.newStartLine - h.oldStartLine);
// // 																		const numLinesRemovedAbove: number =  h.lines.slice(0, index)
// // 																												.filter((s: string) => s[0] === '-').length - (h.newStartLine - h.oldStartLine);
// // 																		return { 
// // 																			line: l, 
// // 																			offsetInArray: index, 
// // 																			numLinesAddedAbove,
// // 																			numLinesRemovedAbove, 
// // 																			originalLineNumber: h.oldStartLine + index - h.lines.slice(0, index)
// // 																																  .filter((s: string) => s[0] === '+').length,
// // 																			translatedLineNumber: 
// // 																		  } 
// // 																	  }
																	  
// // 																	})
// // 																	.filter((l: {[key: string]: any} | undefined) => l !== undefined );