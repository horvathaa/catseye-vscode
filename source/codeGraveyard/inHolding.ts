// export const writeConsoleLogToFile = async (text: string[]) : Promise<void> => {
// 	let uri;
// 	let str = "";
// 	text.forEach(t => str += t + '\n');
// 	if(vscode.workspace.workspaceFolders)
// 	uri = vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.path + '/list.txt');
// 	try {
// 		if(uri && vscode.workspace.workspaceFolders) {
// 			await vscode.workspace.fs.stat(uri);
// 			vscode.workspace.openTextDocument(vscode.workspace.workspaceFolders[0].uri.path + '/list.txt').then(doc => { 
// 				vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(str)).then(() => {
// 					console.log('done')
// 				})
// 			})
// 		}
		
// 	}
// 	catch {
// 		// console.log('file does not exist');
// 		const wsEdit = new vscode.WorkspaceEdit();
// 		if(uri && vscode.workspace.workspaceFolders) {
// 			wsEdit.createFile(uri)
// 			vscode.workspace.applyEdit(wsEdit).then((value: boolean) => {
// 				if(value && vscode.workspace.workspaceFolders) { // edit applied??
// 					vscode.workspace.openTextDocument(vscode.workspace.workspaceFolders[0].uri.path + '/list.txt').then(doc => { 
// 						vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(str)).then(() => {
// 							console.log('done')
// 						})
// 					})
// 				}
// 				else {
// 					vscode.window.showInformationMessage('Could not create file!');
// 				}
// 			});
// 		}
		
// 	}
// }

// export const readAnnotationsFromFile = () : void => {
// 	let filePath = "";
// 	if(vscode.workspace.workspaceFolders !== undefined) {
// 		filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.json';
// 		const uri = vscode.Uri.file(filePath);
// 		try {
// 			vscode.workspace.fs.stat(uri);
// 			vscode.workspace.openTextDocument(filePath).then(doc => { 
// 				let docText = JSON.parse(doc.getText())
// 				const tempAnnoList: Annotation[] = [];
// 				docText.forEach((doc: any) => {
// 					const readAnno = { deleted: false, ...doc };
// 					tempAnnoList.push(readAnno);
// 				})
// 				// if we have an active editor, sort by that file - else, leave the list
// 				vscode.window.activeTextEditor ? setAnnotationList(sortAnnotationsByLocation(tempAnnoList, vscode.window.activeTextEditor?.document.uri.toString())) : setAnnotationList(tempAnnoList);
// 				const filenames = [... new Set(tempAnnoList.map(a => a.filename))];
// 				if(annotationList.length && vscode.window.activeTextEditor !== undefined && filenames.includes(vscode.window.activeTextEditor?.document.uri.toString())) {
// 					let ranges = annotationList.map(a => { return {filename: a.filename, range: createRangeFromAnnotation(a)}}).filter(r => r.filename === vscode.window.activeTextEditor?.document.uri.toString()).map(a => a.range);
// 					if(ranges.length) {
// 						vscode.window.activeTextEditor.setDecorations(annotationDecorations, ranges);
// 					} 
// 				}
// 			})
// 		}
// 		// file does not exist - user either deleted it or this is their first time making an annotation
// 		catch {
// 			// console.log('file does not exist');
// 			const wsEdit = new vscode.WorkspaceEdit();
// 			wsEdit.createFile(uri)
// 			vscode.workspace.applyEdit(wsEdit);
// 		}

// 	}
// }

// export const convertFromJSONtoAnnotationList = (json: string) : Annotation[] => {
// 	let annotationList: Annotation[] = [];
// 	JSON.parse(json).forEach((doc: any) => {
// 		annotationList.push(buildAnnotation({...doc, deleted: false}))
// 	})
// 	return annotationList;
// }


// export const findOutOfDateAnchors = (annotationList: Annotation[], doc: vscode.TextDocument) : void => {
// 	const cleanAnchorAnnos : Annotation[] = annotationList.map((a: Annotation) => buildAnnotation(a, doc.validateRange(createRangeFromAnnotation(a))));
// 	console.log('cleaned', cleanAnchorAnnos);
// 	const anchorTextNotFoundAnnos : Annotation[] = cleanAnchorAnnos.filter((a: Annotation) => doc.getText(createRangeFromAnnotation(a)) !== a.anchorText);
// 	console.log('anchorTextNotFound', anchorTextNotFoundAnnos);
// 	// try and find anchor text elsewhere in document
// 	const searchedAnchorAnnos = anchorTextNotFoundAnnos.map((a) => buildAnnotation(a, createRangeFromObject(findAnchorInRange(undefined, a.anchorText, doc, doc.getText(), (a.anchorText.match(/\n/g) || []).length, (a.anchorText.match(/\n/g) || []).length === 0))));
// 	const foundAnnos = searchedAnchorAnnos.filter((a) => a.anchorText === doc.getText(createRangeFromAnnotation(a)));
// 	const didNotFindAnnos = searchedAnchorAnnos.filter((a) => a.anchorText === '' || a.anchorText !== doc.getText(createRangeFromAnnotation(a)));
// 	console.log('found annos', foundAnnos, 'did not find', didNotFindAnnos);
// 	setOutOfDateAnnotationList(didNotFindAnnos);
// 	const outOfDateIds = didNotFindAnnos.map(a => a.id);
// 	const foundAnchorTextAnnos = foundAnnos.map(a => a.id);
// 	const updatedList = cleanAnchorAnnos.map((a) => {
// 		if(foundAnchorTextAnnos.includes(a.id)) {
// 			return foundAnnos.filter(anno => anno.id === a.id)[0]
// 		}
// 		else if(outOfDateIds.includes(a.id)) {
// 			return buildAnnotation({...searchedAnchorAnnos.filter(anno => anno.id === a.id)[0], deleted: true})
// 		}
// 		else {
// 			return a;
// 		}
// 	});
// 	// setAnnotationList(updatedList);
// }


// const computeOffsets = (text: string, anchorStart: number, lastLineOfAnchor: string, anchorLength: number, rangeStart: number, areTokensSame: boolean) : {[key: string] : any}  => {
// 	let startOffset = 0;
// 	let endOffset = 0;
// 	let precedingLines = 0;
// 	let s = anchorStart;
// 	const splitStr = text.substring(0, anchorStart);
// 	const str = splitStr.substring(0, splitStr.lastIndexOf('\n'));
// 	startOffset = splitStr.length - str.length;
// 	endOffset = lastLineOfAnchor.length;
// 	precedingLines = (text.substring(0, anchorStart).match(/\n/g) || []).length;
// 	// console.log('s before', s, 
// 	// 'lastLine', lastLineOfAnchor, 'anchorLength', anchorLength);
	
// 	// // if there is newlines in our change text and this is not a single line/inner anchor
// 	// // walk backwards to find the last newline as that is the starting offset
// 	// if(text.includes('\n') && !areTokensSame) {
// 	// 	if(!(s === 0 || text[s - 1] === '\n')) {
// 	// 		while(text[s] && text[s] !== '\n') {
// 	// 			s--;
// 	// 		}
// 	// 		startOffset = anchorStart - s;
// 	// 	}

// 	// 	console.log('endOffset', endOffset, 'precedingLines', precedingLines, 'anchorStart', anchorStart, 's', s);
// 	// }
// 	// // this is a single line change so the offset should just be the range start + the offset
// 	// // we already computed
// 	// else {
// 	// 	startOffset = rangeStart + anchorStart; // need to add difference in length between this and changetext
// 	// 	endOffset = startOffset + anchorLength;
// 	// }

// 	return {
// 		startOffset,
// 		endOffset,
// 		precedingLines
// 	};
// }






// const findBestMatchInString = (candidateMatches: number[], anchorSlice: string[], text: string, len: number) : {[key: string] : any} => {
// 	let index: number = 0
// 	let stringStart = 0;
// 	let stringEnd = 0;
// 	// look at next word and see if it appears after one of our indices
// 	// -- repeat until all options are ruled out except one
// 	const candidateAnchors = candidateMatches.map((i: number) => {return { index: i, arr: text.substring(i, i + len).split(/\s+/g) }});
// 	// simple heuristic -- can we find one of these candidate matches that is the same length as our tokenized anchor?
// 	const checkIfWeFoundIt = candidateAnchors.filter((obj) => obj.arr.length === anchorSlice.length)
// 	// if so we're done
// 	if(checkIfWeFoundIt.length === 1) {
// 		stringStart = checkIfWeFoundIt[0].index;
// 		stringEnd = checkIfWeFoundIt[0].index + len;
// 	}
// 	// if not, iterate to find the best match
// 	else {
// 		let numMatches : number[] = [];
// 		// I'm 100000% sure there's a better way to do this LMAO
// 		candidateAnchors.forEach((obj: {[key: string] : any}) => {
// 			for(let i = 0; i < obj.arr.length; i++) {
// 				if(obj.arr[i] !== anchorSlice[i]) {
// 					numMatches.push(i);
// 					return;
// 				}
// 				// matched on every token - return
// 				else if(i === (obj.arr.length - 1)) {
// 					numMatches.push(obj.arr.length);
// 					return;
// 				}
// 			}
// 		});

// 		index = numMatches.indexOf(Math.max(...numMatches)) === -1 ? 0 : numMatches.indexOf(Math.max(...numMatches));
// 		stringStart = candidateAnchors[index].index;
// 		stringEnd = candidateAnchors[index].index + len;
// 	}

// 	console.log('string start', stringStart,
// 	 'stringEnd', stringEnd);
// 	console.log('substring', text.substring(stringStart, stringEnd))

// 	return {
// 		stringStart: stringStart,
// 		stringEnd: stringEnd
// 	};
// }

// export const findOutOfDateAnchors = (missingAnchorAnnotationList: Annotation[], TextEditor: vscode.TextEditor) : void => {
// 	const cleanAnchorAnnos : Annotation[] = missingAnchorAnnotationList.map((a: Annotation) => buildAnnotation(a, TextEditor.document.validateRange(createRangeFromAnnotation(a))));
// 	console.log('cleaned', cleanAnchorAnnos);
// 	const anchorTextNotFoundAnnos : Annotation[] = cleanAnchorAnnos.filter((a: Annotation) => TextEditor.document.getText(createRangeFromAnnotation(a)) !== a.anchorText);
// 	console.log('anchorTextNotFound', anchorTextNotFoundAnnos);
// 	// try and find anchor text elsewhere in document
// 	const searchedAnchorAnnos = anchorTextNotFoundAnnos.map((a) => {
// 		const newAnchor: {[key: string]: any} = findAnchorInRange(undefined, a.anchorText, TextEditor.document.getText(), undefined, createRangeFromAnnotation(a)); 
// 		return buildAnnotation(a, createRangeFromObject(newAnchor));
// 	});
// 	searchedAnchorAnnos.forEach((a) => {
// 		a.anchorText = TextEditor.document.getText(createRangeFromAnnotation(a));
// 	});
// 	console.log('updated', searchedAnchorAnnos);
// 	// const foundAnnos = searchedAnchorAnnos.filter((a) => a.anchorText === doc.getText(createRangeFromAnnotation(a)));
// 	// const didNotFindAnnos = searchedAnchorAnnos.filter((a) => a.anchorText === '' || a.anchorText !== doc.getText(createRangeFromAnnotation(a)));
// 	// console.log('searched', searchedAnchorAnnos, 'found annos', foundAnnos, 'did not find', didNotFindAnnos);
// 	const anchorUpdatedAnnotations: string[] = searchedAnchorAnnos.map(a => a.id);
// 	setAnnotationList(annotationList.filter(a => !anchorUpdatedAnnotations.includes(a.id)).concat(searchedAnchorAnnos));
// 	// addHighlightsToEditor(searchedAnchorAnnos, TextEditor);
// 	// setOutOfDateAnnotationList

// 	// const outOfDateIds = didNotFindAnnos.map(a => a.id);
// 	// const foundAnchorTextAnnos = foundAnnos.map(a => a.id);
// 	// const updatedList = cleanAnchorAnnos.map((a) => {
// 	// 	if(foundAnchorTextAnnos.includes(a.id)) {
// 	// 		return foundAnnos.filter(anno => anno.id === a.id)[0]
// 	// 	}
// 	// 	else if(outOfDateIds.includes(a.id)) {
// 	// 		return buildAnnotation({...searchedAnchorAnnos.filter(anno => anno.id === a.id)[0], deleted: true})
// 	// 	}
// 	// 	else {
// 	// 		return a;
// 	// 	}
// 	// });
// 	// setAnnotationList(updatedList);
// }

// // computes boundary points of each annotation's range given offsets or the changed text
// export const findAnchorInRange = (range: vscode.Range | undefined, anchor: string, changeText: string, offsetData: {[key: string] : any} | undefined, originalRange: vscode.Range) : {[key: string] : any} => {
// 	// if this is a regular copy/cut/paste event, 
// 	// we should have the offsets from the copied range
// 	if(offsetData) {
// 		const newAnchor = {
// 			startLine: range?.start.line + offsetData.startLine,
// 			startOffset: range?.start.character + offsetData.startOffset, 
// 			endLine: range?.start.line + offsetData.endLine,
// 			endOffset: range?.end.character + offsetData.endOffset,
// 		}

// 		return newAnchor;
// 	}
// 	// if not, we use anchor text to try and find the best
// 	// candidate
// 	// const tokenizedRange = changeText.split(/\s+/g);
// 	// const tokenizedAnchorWhitespace = anchor.split(/\s+/g); 
// 	const cleanFrontAnchor = anchor.trimStart();
// 	// const cleanBackAnchor = anchor.trimEnd();
// 	const tokenizedAnchor = cleanFrontAnchor.split(/\s+/g);
// 	const firstElOfAnchor = tokenizedAnchor[0];
// 	// const tokenizedBackAnchor = cleanBackAnchor.split(/\s+/g);
// 	// const lastEl = tokenizedBackAnchor[tokenizedBackAnchor.length - 1];

// 	// // try and find start of our anchor
// 	// let { tokenStart, tokenEnd } = findBoundariesOfAnchor(tokenizedRange, tokenizedAnchorWhitespace, firstElOfAnchor, lastEl, false);
// 	// let startingToken = tokenStart, endingToken = tokenEnd;
// 	// console.log('startingToken', startingToken, 'endingToken', endingToken);
// 	// if(!startingToken && !endingToken) {
// 	// 	const { tokenStart, tokenEnd} = findBoundariesOfAnchor(tokenizedRange, tokenizedAnchorWhitespace, firstElOfAnchor, lastEl, true);
// 	// 	startingToken = tokenStart;
// 	// 	endingToken = tokenEnd;
// 	// }

// 	let anchorStartIndex: number = 0;
// 	let anchorEndIndex: number = 0;
// 	// const anchorSlice = tokenizedRange.slice(startingToken, endingToken + 1);

// 	// get string to look for inside the inputted text - if tokenStart === tokenEnd that means we either never found a match
// 	// or the token is contained within a single piece of text in which case we just use the first element
// 	// of the anchor itself -- if not, we use whatever starting token the prior method found
// 	// const searchString = startingToken === endingToken ? firstElOfAnchor : tokenizedRange[startingToken];
	
// 	// get list of indices in which the first token in our anchor appears (should at least have 1)
// 	const candidateMatches = getIndicesOf(firstElOfAnchor, changeText, true);
// 	console.log('candidateMatches', candidateMatches);
// 	// console.log('changeText', changeText);
// 	console.log('anchor', anchor);
	
// 	// if we only have one match, that's our location
// 	if(candidateMatches.length === 1) {
// 		console.log('one match')
// 		anchorStartIndex = candidateMatches[0];
// 		anchorEndIndex = candidateMatches[0] + anchor.length;
// 	}
// 	else if(candidateMatches.length > 1) {
// 		console.log('best match')
// 		const { stringStart, stringEnd } = findBestMatchInString(candidateMatches, tokenizedAnchor, changeText, anchor.length);
// 		anchorStartIndex = stringStart;
// 		anchorEndIndex = stringEnd;
// 	}
// 	// I don't think we ever actually go in here - maybe delete
// 	else {
// 		console.log('in else')
// 		anchorStartIndex = changeText.indexOf(tokenizedAnchor[0]);
// 		anchorEndIndex = anchorStartIndex + anchor.length;
// 	}
// 	console.log('anchorStart', anchorStartIndex, 'anchorEnd', anchorEndIndex);
	
// 	// get anchor text as it appears in the text
// 	const anchorTextInText : string = changeText.substring(anchorStartIndex, anchorEndIndex); // might not even need this ?
// 	console.log('anchorTextInText', anchorTextInText);
// 	const lastLineOfAnchor : string = anchorTextInText.includes('\n') ? anchorTextInText.substring(anchorTextInText.lastIndexOf('\n')) : anchorTextInText;
// 	console.log('lastLineOfAnchor', lastLineOfAnchor);
// 	const { startOffset, endOffset, precedingLines } = computeOffsets(changeText, anchorStartIndex, lastLineOfAnchor, anchor.length, range ? range.start.character : 0, tokenizedAnchor.length === 1);
// 	console.log('range', range, 'precedingLines', precedingLines, 'startOffset', startOffset, 'endOffset', endOffset)

// 	const newAnchor = {
// 		startLine: precedingLines,
// 		startOffset,
// 		endLine: precedingLines + (anchorTextInText.match(/\n/g) || []).length,
// 		endOffset
// 	}

// 	console.log('newAnchor', newAnchor);

// 	return newAnchor;

// }
