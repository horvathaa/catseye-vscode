import { annotationList, view, setUser, setView, tempAnno, setTempAnno, annotationDecorations, setAnnotationList, setCopiedAnnotationList } from "../extension";
import Annotation from '../constants/constants';
import * as anchor from '../anchorFunctions/anchor';
import * as vscode from 'vscode';
import * as utils from '../utils/utils';
import firebase from '../firebase/firebase';
import ViewLoader from "../view/ViewLoader";
import { v4 as uuidv4 } from 'uuid';

export const overriddenClipboardCopyAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
    const annotationsInEditor = annotationList.filter((a: Annotation) => a.filename === textEditor.document.uri.toString());
    const annosInRange = anchor.getAnchorsInRange(textEditor.selection, annotationsInEditor);
    if(annosInRange.length) {
        const annoIds = annosInRange.map(a => a.id)
        setCopiedAnnotationList(annotationList.filter(a => annoIds.includes(a.id)));
    }
    vscode.env.clipboard.writeText(textEditor.document.getText(textEditor.selection));

}

export const init = (context: vscode.ExtensionContext) => {
    let filePath = "";
		if(vscode.workspace.workspaceFolders !== undefined) {
			filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.json';
			const uri = vscode.Uri.file(filePath);
			try {
				vscode.workspace.fs.stat(uri);
				vscode.workspace.openTextDocument(filePath).then(doc => { 
					let docText = JSON.parse(doc.getText())
					docText.forEach((doc: any) => {
						annotationList.push(new Annotation(doc.id, doc.filename, doc.visiblePath, doc.anchorText, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset, false, doc.html))
					})
					// if we have an active editor, sort by that file - else, leave the list
					vscode.window.activeTextEditor ? setAnnotationList(utils.sortAnnotationsByLocation(annotationList, vscode.window.activeTextEditor?.document.uri.toString())) : setAnnotationList(annotationList);
					const filenames = [... new Set(annotationList.map(a => a.filename))];
					if(annotationList.length && vscode.window.activeTextEditor !== undefined && filenames.includes(vscode.window.activeTextEditor?.document.uri.toString())) {
						let ranges = annotationList.map(a => { return {filename: a.filename, range: anchor.createRangeFromAnnotation(a)}}).filter(r => r.filename === vscode.window.activeTextEditor?.document.uri.toString()).map(a => a.range);
						if(ranges.length) {
							vscode.window.activeTextEditor.setDecorations(annotationDecorations, ranges);
						} 
					}
				})
			}
			// file does not exist - user either deleted it or this is their first time making an annotation
			catch {
				// console.log('file does not exist');
				const wsEdit = new vscode.WorkspaceEdit();
				wsEdit.createFile(uri)
				vscode.workspace.applyEdit(wsEdit);
			}

		}


	/***********************************************************************************/
	/**************************************** VIEW LISTENERS ******************************/
	/*************************************************************************************/
		if(vscode.workspace.workspaceFolders) {
			setView(new ViewLoader(vscode.workspace.workspaceFolders[0].uri, context.extensionPath));
			if(view) {
				view?.logIn();
				view._panel?.webview.onDidReceiveMessage((message) => {
					 switch(message.command) {
						 // get anno and scroll to it in the editor
						 case 'scrollInEditor': {
							 const anno = annotationList.filter(anno => anno.id === message.id)[0];
							 if(anno) {
								 const range = anchor.createRangeFromAnnotation(anno);
								 const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === anno.filename)[0];
								 text?.revealRange(range, 1);
							 }
							 break;
						 }
						 case 'emailAndPassReceived': {
							 const { email, pass } = message;
							 firebase.auth().signInWithEmailAndPassword(email, pass).then((result: any) => {
								const db = firebase.firestore();
								const annotationsRef = db.collection('annotations');
								setUser(result.user);
								// const vscodeAnnotationsRef = db.collection('vscode-annotations');
								annotationsRef.where('authorId', '==', result.user.uid).get().then((snapshot: firebase.firestore.QuerySnapshot) => {
									const annoDocs = utils.getListFromSnapshots(snapshot);
									// console.log('any', annoDocs)
									// const serializedObjects: Annotation[] = annoDocs.map((a: any) => {
									// 	if(safeArrayCheck(a.url) && safeArrayCheck(a.childAnchor)) return new Annotation(a.id, a.url[0], a.childAnchor[0].anchor, a.content, a.childAnchor[0].url, a.childAnchor[0].url, a.childAnchor[0].url, a.childAnchor[0].url, false, a.content);
									// })
									view?.updateDisplay(annotationList);
								});
								
								// const serializedObjects = annotationList.map(a => { return {
								// 	id: a.id,
								// 	filename: a.filename,
								// 	authorId: result.user.uid,
								// 	anchorText: a.anchorText,
								// 	annotation: a.annotation,
								// 	anchor: {
								// 		startLine: a.startLine,
								// 		endLine: a.endLine,
								// 		startOffset: a.startOffset,
								// 		endOffset: a.endOffset
								// 	},
								// 	html: a.html ? a.html : "",
								// 	programmingLanguage: a.filename.toString().split('.')[1],
								// 	createdTimestamp: new Date().getTime()
								// }})
								// serializedObjects.forEach(a => {
								// 	vscodeAnnotationsRef.doc(a.id).set(a)
								// })
							}).catch((error) => {
								console.log('err', error);
								view?.logIn();
							});
							break;
						 }
						 case 'createAnnotation': {
							 // finalize annotation creation
							if(!tempAnno) return
							utils.getShikiCodeHighlighting(tempAnno.filename.toString(), tempAnno.anchorText).then(html => {
								if(tempAnno) {
                                    let newAnno = tempAnno;
									newAnno.annotation = message.anno;
									newAnno.html = html;
									setAnnotationList(annotationList.concat([newAnno]));
									const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === tempAnno?.filename)[0];
									setTempAnno(null);
									setAnnotationList(utils.sortAnnotationsByLocation(annotationList, text.document.uri.toString()));
									view?.updateDisplay(annotationList);
									const filenames = [... new Set(annotationList.map(a => a.filename))];
									// add highlight for new anno
									if(annotationList.length && text && filenames.includes(text.document.uri.toString())) {
										let ranges = annotationList
											.map(a => { return {annotation: a.annotation, filename: a.filename, range: anchor.createRangeFromAnnotation(a)}})
											.filter(r => r.filename === text?.document.uri.toString())
											.map(a => { return {annotation: a.annotation, range: a.range }});
										if(ranges.length) {
											try {
												const decorationOptions: vscode.DecorationOptions[] = ranges.map(r => { return { range: r.range, hoverMessage: r.annotation } });
												text.setDecorations(annotationDecorations, decorationOptions);
											}
											catch (error) {
												console.log('couldnt highlight', error);
											}
										} 
									}
								}

							});

							break;
						}
						case 'cancelAnnotation': {
							// reset temp object and re-render
							setTempAnno(null);
							view?.updateDisplay(annotationList);
							break;
						}
						default: {
							break;
						}
							
					}
					
				 })
			}
		}
}

export const createNewAnnotation = () => {
    const { activeTextEditor } = vscode.window;
    if (!activeTextEditor) {
        vscode.window.showInformationMessage("No text editor is open!");
        return;
        }
        
    const text = activeTextEditor.document.getText(activeTextEditor.selection);
    const r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
    utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then(html => {
		!vscode.workspace.workspaceFolders ? 
			setTempAnno(new Annotation(uuidv4(), activeTextEditor.document.uri.toString(), activeTextEditor.document.uri.fsPath, text, 'test',  r.start.line, r.end.line, r.start.character, r.end.character, false, html)) 
			: setTempAnno(new Annotation(uuidv4(), activeTextEditor.document.uri.toString(), utils.getVisiblePath(activeTextEditor.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath), text, 'test',  r.start.line, r.end.line, r.start.character, r.end.character, false, html));
        view?.createNewAnno(html, annotationList);
    })
}