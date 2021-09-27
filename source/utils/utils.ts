import firebase from '../firebase/firebase';
import Annotation from '../constants/constants';
import { user, setAnnotationList, annotationList, annotationDecorations } from '../extension';
import { createRangeFromAnnotation } from '../anchorFunctions/anchor';
import * as vscode from 'vscode';
var shiki = require('shiki');

export function safeArrayCheck(objProperty: any) : boolean {
	return objProperty && Array.isArray(objProperty) && objProperty.length;
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

export const sortAnnotationsByLocation = (annotationList: Annotation[], filename: string) : Annotation[] => {
	annotationList.sort((a: Annotation, b: Annotation) => {
		return b.startLine - a.startLine === 0 ? b.startOffset - a.startOffset : b.startLine - a.startLine;
	});
	annotationList.sort((a: Annotation, b: Annotation) => {
		// if a is the same as the filename and b isn't OR if a and b are both pointing at the same file, keep the order
		// else move annotation b before a
		const order = (a.filename === filename && b.filename !== filename) || (a.filename === b.filename && a.filename === filename) ? -1 : 1;
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


export const handleSaveCloseEvent = (annotationList: Annotation[], filePath: string, currentFile: string) : void => {
	const annotationsInCurrentFile = currentFile !== "all" ? annotationList.filter(a => a.filename === currentFile) : annotationList;
	if(annotationsInCurrentFile.length && vscode.workspace.workspaceFolders !== undefined) {
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
		programmingLang: a.programmingLang
	}})

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
				annotationList.forEach(a => a.toDelete = false);
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
						annotationList.forEach(a => a.toDelete = false);
					})
				})
			}
			else {
				vscode.window.showInformationMessage('Could not create file!');
			}
		});
	}
}

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
// 					const readAnno = { toDelete: false, ...doc };
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
// 		annotationList.push(buildAnnotation({...doc, toDelete: false}))
// 	})
// 	return annotationList;
// }

export const getVisiblePath = (filePath: string, workspacePath: string) : string => {
	const slash = workspacePath.includes('/') ? '/' : '\\';
	const workspaceHead = workspacePath.split(slash).pop() ? workspacePath.split(slash).pop() : slash;
	const path = workspaceHead ? workspaceHead + filePath.split(workspaceHead).pop() : filePath;
	if(path) return path;
	return filePath;
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
		annoObj['toDelete'],
		annoObj['html'],
		annoObj['authorId'],
		annoObj['createdTimestamp'],
		annoObj['programmingLang']
	)
}