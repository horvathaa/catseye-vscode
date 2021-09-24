import firebase from '../firebase/firebase';
import Annotation from '../constants/constants';
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
		writeAnnotationsToFile(annotationList, filePath);
	}
}

export const writeAnnotationsToFile = async (annotationList: Annotation[], filePath: string) : Promise<void> => {
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
		html: a.html
	}})

	if(vscode.workspace.workspaceFolders !== undefined)  {
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
}


export const convertFromJSONtoAnnotationList = (json: string) : Annotation[] => {
	let annotationList: Annotation[] = [];
	JSON.parse(json).forEach((doc: any) => {
		annotationList.push(new Annotation(doc.id, doc.filename, doc.visiblePath, doc.anchorText, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset, false, doc.html))
	})
	return annotationList;
}

export const getVisiblePath = (filePath: string, workspacePath: string) : string => {
	const slash = workspacePath.includes('/') ? '/' : '\\';
	const workspaceHead = workspacePath.split(slash).pop() ? workspacePath.split(slash).pop() : slash;
	const path = workspaceHead ? workspaceHead + filePath.split(workspaceHead).pop() : filePath;
	if(path) return path;
	return filePath;
	
}  