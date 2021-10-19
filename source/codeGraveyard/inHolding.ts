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