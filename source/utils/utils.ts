import firebase from '../firebase/firebase';
import Annotation from '../constants/constants';
import { createRangeFromAnnotation, createRangeFromObject, findAnchorInRange } from '../anchorFunctions/anchor';
import { user, annotationList, view, setAnnotationList, setOutOfDateAnnotationList } from '../extension';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
var shiki = require('shiki');

let lastSavedAnnotations: Annotation[] = annotationList && annotationList.length ? annotationList : [];

// https://stackoverflow.com/questions/27030/comparing-arrays-of-objects-in-javascript
const objectsEqual = (o1: { [key: string ] : any }, o2: { [key: string ] : any }) : boolean => 
    typeof o1 === 'object' && Object.keys(o1).length > 0 
        ? Object.keys(o1).length === Object.keys(o2).length 
            && Object.keys(o1).every(p => objectsEqual(o1[p], o2[p]))
        : o1 === o2;

const arraysEqual = (a1: any[], a2: any[]) : boolean => {
	return a1.length === a2.length && a1.every((o, idx) => objectsEqual(o, a2[idx]));
} 

export const removeOutOfDateAnnotations = (annotationList: Annotation[]) : Annotation[] => {
	return annotationList.filter(a => !a.deleted);
}

export function getListFromSnapshots(snapshots: firebase.firestore.QuerySnapshot) : any[] {
    let out: any = [];
    snapshots.forEach(snapshot => {
        out.push({
            id: snapshot.id, ...snapshot.data(),
        });
    });
    return out;
}

export const reconstructAnnotations = (annotationList: Annotation[], text: string, changeRange: vscode.Range, filePath: vscode.Uri, workspace: vscode.Uri, doc: vscode.TextDocument) : Annotation[] => {
	return annotationList.map((a: Annotation) => {
		const adjustedAnno = {
			id: uuidv4(),
			filename: filePath.toString(),
			visiblePath: getVisiblePath(filePath.fsPath, workspace.fsPath),
			anchorText: a.anchorText,
			annotation: a.annotation,
			anchor: findAnchorInRange(changeRange, a.anchorText, doc, text, a.endLine - a.startLine, a.startLine === a.endLine),
			deleted: false,
			html: a.html,
			authorId: a.authorId,
			createdTimestamp: new Date().getTime(),
			programmingLang: a.programmingLang
		}
		return buildAnnotation(adjustedAnno);
	});
}

export const checkIfChangeIncludesAnchor = (annotationList : Annotation[], text: string) : Annotation[] => {
	const anchorTextArr : {[key: string] : any}[] = annotationList.map((a : Annotation) => { return { cleanText: a.anchorText.replace(/\s+/g, ''), id: a.id } });
	const cleanChangeText = text.replace(/\s+/g, '');
	if(cleanChangeText === "") return [];
	const matches: string[] = anchorTextArr.filter((a: {[key: string] : any}) => (cleanChangeText.includes(a.cleanText))).map(a => a.id); // bug: if the user annotates something common like just "console" this will match on other instances it shouldn't
	return annotationList.filter((a: Annotation) => matches.includes(a.id));
}

export const findOutOfDateAnchors = (annotationList: Annotation[], doc: vscode.TextDocument) : void => {
	const cleanAnchorAnnos : Annotation[] = annotationList.map((a: Annotation) => buildAnnotation(a, doc.validateRange(createRangeFromAnnotation(a))));
	console.log('cleaned', cleanAnchorAnnos);
	const anchorTextNotFoundAnnos : Annotation[] = cleanAnchorAnnos.filter((a: Annotation) => doc.getText(createRangeFromAnnotation(a)) !== a.anchorText);
	console.log('anchorTextNotFound', anchorTextNotFoundAnnos);
	// try and find anchor text elsewhere in document
	const searchedAnchorAnnos = anchorTextNotFoundAnnos.map((a) => buildAnnotation(a, createRangeFromObject(findAnchorInRange(undefined, a.anchorText, doc, doc.getText(), (a.anchorText.match(/\n/g) || []).length, (a.anchorText.match(/\n/g) || []).length === 0))));
	const foundAnnos = searchedAnchorAnnos.filter((a) => a.anchorText === doc.getText(createRangeFromAnnotation(a)));
	const didNotFindAnnos = searchedAnchorAnnos.filter((a) => a.anchorText === '' || a.anchorText !== doc.getText(createRangeFromAnnotation(a)));
	console.log('found annos', foundAnnos, 'did not find', didNotFindAnnos);
	setOutOfDateAnnotationList(didNotFindAnnos);
	const outOfDateIds = didNotFindAnnos.map(a => a.id);
	const foundAnchorTextAnnos = foundAnnos.map(a => a.id);
	const updatedList = cleanAnchorAnnos.map((a) => {
		if(foundAnchorTextAnnos.includes(a.id)) {
			return foundAnnos.filter(anno => anno.id === a.id)[0]
		}
		else if(outOfDateIds.includes(a.id)) {
			return buildAnnotation({...searchedAnchorAnnos.filter(anno => anno.id === a.id)[0], deleted: true})
		}
		else {
			return a;
		}
	});
	// setAnnotationList(updatedList);
}

export const sortAnnotationsByLocation = (annotationList: Annotation[], filename: string | undefined) : Annotation[] => {
	annotationList.sort((a: Annotation, b: Annotation) => {
		return b.startLine - a.startLine === 0 ? b.startOffset - a.startOffset : b.startLine - a.startLine;
	});
	annotationList.sort((a: Annotation, b: Annotation) => {
		// if a is the same as the filename and b isn't OR if a and b are both pointing at the same file, keep the order
		// else move annotation b before a
		let order: number = -1;
		if(filename) order = (a.filename === filename && b.filename !== filename) || (a.filename === b.filename && a.filename === filename) ? -1 : 1;
		return order;
	})
	return annotationList;
}

export const getShikiCodeHighlighting = async (filename: string, anchorText: string): Promise<string> => {
	const highlighter = await shiki.getHighlighter({ theme: 'dark-plus' });
	const regexMatch = filename.match(/\.[0-9a-z]+$/i);
	const pl = regexMatch ? regexMatch[0].replace(".", "") : "js";
	const html = highlighter.codeToHtml(anchorText, pl);
	// either return the marked-up HTML or just return the basic anchor text
	return html ? html : anchorText;
}

const updateHtml = async (annos: Annotation[], doc: vscode.TextDocument) : Promise<Annotation[]> => {
	let updatedList : Annotation [] = [];
	for(let x = 0; x < annos.length; x++) {
		const newVscodeRange = new vscode.Range(new vscode.Position(annos[x].startLine, annos[x].startOffset), new vscode.Position(annos[x].endLine, annos[x].endOffset));
		const newAnchorText = doc.getText(newVscodeRange);
		const newHtml = await getShikiCodeHighlighting(annos[x].filename.toString(), newAnchorText);
		const newAnno = buildAnnotation({
			...annos[x], html: newHtml, anchorText: newAnchorText
		});
		// probably should do a more conservative check (e.g., strip whitespace?)
		if(newAnchorText !== annos[x].anchorText) view?.updateHtml(newHtml, newAnchorText, annos[x].id);
		updatedList.push(newAnno);
	}

	return updatedList;

}


export const handleSaveCloseEvent = async (annotationList: Annotation[], filePath: string = "", currentFile: string = "all", doc : vscode.TextDocument | undefined = undefined) : Promise<void> => {
	const annotationsInCurrentFile = currentFile !== "all" ? annotationList.filter(a => a.filename === currentFile) : annotationList;
	console.log('in current file', annotationsInCurrentFile, 'bool', !arraysEqual(annotationList, lastSavedAnnotations), 'doc', doc)
	if(doc) {
		let newList = await updateHtml(annotationsInCurrentFile, doc);
		const ids = newList.map(a => a.id);
		currentFile === 'all' ? setAnnotationList(newList) : setAnnotationList(annotationList.filter(a => !ids.includes(a.id)).concat(newList))
		lastSavedAnnotations = annotationList;
		console.log('saving', annotationList);
		saveAnnotations(annotationList, filePath);
	}
	else if(annotationsInCurrentFile.length && vscode.workspace.workspaceFolders && !arraysEqual(annotationList, lastSavedAnnotations)) {
		lastSavedAnnotations = annotationList;
		console.log('saving...');
		saveAnnotations(annotationList, filePath);
	}
}

export const saveAnnotations = async (annotationList: Annotation[], filePath: string) : Promise<void> => {
	const serializedObjects = annotationList.map(a => { return {
		id: a.id,
		filename: a.filename,
		visiblePath: a.visiblePath,
		anchorText: a.anchorText,
		annotation: a.annotation,
		anchor: {
			startLine: a.startLine,
			endLine: a.endLine,
			startOffset: a.startOffset,
			endOffset: a.endOffset
		},
		html: a.html,
		authorId: a.authorId,
		createdTimestamp: a.createdTimestamp,
		programmingLang: a.programmingLang,
		deleted: a.deleted
	}});

	if(user) {
		const db = firebase.firestore();
		const annotationsRef = db.collection('vscode-annotations');
		serializedObjects.forEach(a => {
			annotationsRef.doc(a.id).set(a)
		});
	} else if (vscode.workspace.workspaceFolders) {
		writeToFile(serializedObjects, annotationList, filePath);
	}
}

const writeToFile = async (serializedObjects: { [key: string] : any }[], annotationList: Annotation[], filePath: string) : Promise<void> => {
	const uri = vscode.Uri.file(filePath);
	try {
		await vscode.workspace.fs.stat(uri);
		vscode.workspace.openTextDocument(filePath).then(doc => { 
			vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
				annotationList.forEach(a => a.deleted = false);
			})
		})
	}
	catch {
		// console.log('file does not exist');
		const wsEdit = new vscode.WorkspaceEdit();
		wsEdit.createFile(uri)
		vscode.workspace.applyEdit(wsEdit).then((value: boolean) => {
			if(value) { // edit applied??
				vscode.workspace.openTextDocument(filePath).then(doc => { 
					vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
						annotationList.forEach(a => a.deleted = false);
					})
				})
			}
			else {
				vscode.window.showInformationMessage('Could not create file!');
			}
		});
	}
}

export const getVisiblePath = (filePath: string | undefined, workspacePath: string | undefined) : string => {
	if(filePath && workspacePath) {
		const slash = workspacePath.includes('/') ? '/' : '\\';
		const workspaceHead = workspacePath.split(slash).pop() ? workspacePath.split(slash).pop() : slash;
		const path = workspaceHead ? workspaceHead + filePath.split(workspaceHead).pop() : filePath;
		if(path) return path;
	}
	else if(filePath) {
		return filePath;
	}
	return "unknown";

}

export const buildAnnotation = (annoInfo: any, range: vscode.Range | undefined = undefined) : Annotation => {
	const annoObj : { [key: string]: any } = range ? 
	{
		startLine: range.start.line,
		endLine: range.end.line,
		startOffset: range.start.character,
		endOffset: range.end.character,
		...annoInfo
	} : annoInfo.anchor ? {
		startLine: annoInfo.anchor.startLine,
		endLine: annoInfo.anchor.endLine,
		startOffset: annoInfo.anchor.startOffset,
		endOffset: annoInfo.anchor.endOffset,
		...annoInfo
	} : annoInfo;

	return new Annotation(
		annoObj['id'], 
		annoObj['filename'], 
		annoObj['visiblePath'], 
		annoObj['anchorText'],
		annoObj['annotation'],
		annoObj['startLine'],
		annoObj['endLine'],
		annoObj['startOffset'],
		annoObj['endOffset'],
		annoObj['deleted'],
		annoObj['html'],
		annoObj['authorId'],
		annoObj['createdTimestamp'],
		annoObj['programmingLang']
	)
}

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

