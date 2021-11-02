import { gitInfo, annotationList, view, user, setUser, setView, tempAnno, setTempAnno, annotationDecorations, setAnnotationList, setCopiedAnnotationList, copiedAnnotations, setStoredCopyText, setGitInfo, gitApi } from "../extension";
import Annotation from '../constants/constants';
import * as anchor from '../anchorFunctions/anchor';
import * as vscode from 'vscode';
import * as utils from '../utils/utils';
import firebase from '../firebase/firebase';
import ViewLoader from "../view/ViewLoader";
import { v4 as uuidv4 } from 'uuid';

export const init = (context: vscode.ExtensionContext) => {
	/***********************************************************************************/
	/**************************************** VIEW LISTENERS ******************************/
	/*************************************************************************************/
		if(vscode.workspace.workspaceFolders) {
			setGitInfo(utils.generateGitMetaData(gitApi));
			if(view) {
				view._panel?.reveal();
			}
			else {
				const newView : ViewLoader = new ViewLoader(vscode.workspace.workspaceFolders[0].uri, context.extensionPath);
				setView(newView);
				if(newView) {
					newView?.init();
					newView._panel?.webview.onDidReceiveMessage((message) => {
						switch(message.command) {
							// get anno and scroll to it in the editor
							case 'scrollInEditor': {
								const anno = annotationList.filter(anno => anno.id === message.id)[0];
								if(anno) {
									const range = anchor.createRangeFromAnnotation(anno);
									const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === anno.filename)[0];
									if(!text) {
										vscode.workspace.openTextDocument(vscode.Uri.parse(anno.filename.toString()))
										.then((doc: vscode.TextDocument) => {
											vscode.window.showTextDocument(doc, { preserveFocus: true, preview: true, selection: range, viewColumn: view?._panel?.viewColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Two : vscode.ViewColumn.One });
										});
									}
									else {
										text.revealRange(range, 1);
									}
								}
								break;
							}
							case 'emailAndPassReceived': {
								const { email, pass } = message;
								firebase.auth().signInWithEmailAndPassword(email, pass).then((result: any) => {
									const db = firebase.firestore();
									const annotationsRef = db.collection('vscode-annotations');
									setUser(result.user);
									view?.setLoggedIn();
									annotationsRef.where('authorId', '==', result.user.uid).where('deleted', '==', false).where('outOfDate', '==', false).get().then((snapshot: firebase.firestore.QuerySnapshot) => {
										const annoDocs = utils.getListFromSnapshots(snapshot);
										const annotations: Annotation[] = annoDocs && annoDocs.length ? annoDocs.map((a: any) => {
											return utils.buildAnnotation(a);
										}) : [];
										const currFilename: string | undefined = vscode.window.activeTextEditor?.document.uri.path.toString();
										setAnnotationList(utils.sortAnnotationsByLocation(annotations, currFilename));
										if(vscode.workspace.workspaceFolders)
											view?.updateDisplay(annotationList, currFilename, utils.getProjectName(vscode.window.activeTextEditor?.document.uri.fsPath));
										const annoFiles: string[] = annotations.map(a => a.filename.toString());
										vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
											if(annoFiles.includes(v.document.uri.toString())) {
												anchor.addHighlightsToEditor(annotations, v); 
											}
										});
									});
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
										anchor.addHighlightsToEditor(annotationList, text);
									}

								});
								break;
							}
							case 'updateAnnotation': {
								const updatedAnno = utils.buildAnnotation({ ...annotationList.filter(a => a.id === message.annoId)[0], annotation: message.newAnnoContent });
								const updatedList = annotationList.filter(a => a.id !== message.annoId).concat([updatedAnno]);
								const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === updatedAnno?.filename)[0];
								setAnnotationList(utils.sortAnnotationsByLocation(updatedList, text.document.uri.toString()));
								view?.updateDisplay(utils.removeOutOfDateAnnotations(annotationList));
								break;
							}
							case 'deleteAnnotation': {
								const updatedAnno = utils.buildAnnotation({ ...annotationList.filter(a => a.id === message.annoId)[0], deleted: true });
								const updatedList = annotationList.filter(a => a.id !== message.annoId).concat([updatedAnno]);
								utils.saveAnnotations(updatedList, ""); // bad - that should point to JSON but we are also not using that rn so whatever
								const visible : vscode.TextEditor = vscode.window.visibleTextEditors.filter((v: vscode.TextEditor) => v.document.uri.toString() === updatedAnno.filename)[0];
								setAnnotationList(utils.sortAnnotationsByLocation(utils.removeOutOfDateAnnotations(updatedList), visible?.document.uri.toString()));
								view?.updateDisplay(annotationList);
								if(visible) {
									anchor.addHighlightsToEditor(annotationList, visible);
								}
								break;
							}
							case 'cancelAnnotation': {
								// reset temp object and re-render
								setTempAnno(null);
								view?.updateDisplay(utils.removeOutOfDateAnnotations(annotationList));
								break;
							}
							default: {
								break;
							}
								
						}
						
					})

					newView._panel?.onDidDispose((e: void) => {
						utils.handleSaveCloseEvent(annotationList);
						setUser(null);
						setView(undefined);
						vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
							v.setDecorations(annotationDecorations, []);
						});
					}, null, context.subscriptions);

					newView._panel?.onDidChangeViewState((e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
						if(user) {
							view?.reload();
							// known bug : will default to 0 annotations until a new window is made active again when the panel is dragged sigh
							// for now will do but should find a better solution (may consider switching to having vs code handle the state when 
							// panel is not active)
							// console.log('e', e);
							// if(vscode.workspace.workspaceFolders && !e.webviewPanel.active)
							// 	view?.updateDisplay(utils.sortAnnotationsByLocation(utils.removeOutOfDateAnnotations(annotationList)));
						} else {
							view?.init();
						}
					});
				}

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
    utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then((html: string) => {
		const projectName: string = utils.getProjectName(activeTextEditor.document.uri.fsPath);
		const programmingLang: string = activeTextEditor.document.uri.toString().split('.')[activeTextEditor.document.uri.toString().split('.').length - 1];
		const temp = {
			id: uuidv4(),
			filename: activeTextEditor.document.uri.toString(),
			visiblePath: vscode.workspace.workspaceFolders ? 
				utils.getVisiblePath(projectName, activeTextEditor.document.uri.fsPath) : activeTextEditor.document.uri.fsPath,
			anchorText: text,
			annotation: '',
			deleted: false,
			outOfDate: false,
			html,
			programmingLang: programmingLang,
			createdTimestamp: new Date().getTime(),
			authorId: user?.uid,
			gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : "",
			gitBranch: gitInfo[projectName]?.branch ? gitInfo[projectName]?.branch : "",
			gitCommit: "localChange",
			anchorPreview: utils.getFirstLineOfHtml(html, !text.includes('\n')),
			projectName: projectName 
		};
		setTempAnno(utils.buildAnnotation(temp, r));
        view?.createNewAnno(html, annotationList);
    });
}

export const addNewHighlight = () => {
	const { activeTextEditor } = vscode.window;
    if (!activeTextEditor) {
        vscode.window.showInformationMessage("No text editor is open!");
        return;
    }
        
    const text = activeTextEditor.document.getText(activeTextEditor.selection);
    const r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
	const projectName: string = utils.getProjectName(activeTextEditor.document.uri.fsPath);
	// Get the branch and commit 
	const programmingLang: string = activeTextEditor.document.uri.toString().split('.')[activeTextEditor.document.uri.toString().split('.').length - 1];
	utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then(html => {
		const temp = {
			id: uuidv4(),
			filename: activeTextEditor.document.uri.toString(),
			visiblePath: vscode.workspace.workspaceFolders ? 
				utils.getVisiblePath(projectName, activeTextEditor.document.uri.fsPath) :
				activeTextEditor.document.uri.fsPath,
			anchorText: text,
			annotation: '',
			deleted: false,
			outOfDate: false,
			html,
			programmingLang: programmingLang,
			createdTimestamp: new Date().getTime(),
			authorId: user?.uid,
			gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : "",
			gitBranch: gitInfo[projectName]?.branch ? gitInfo[projectName]?.branch : "",
			gitCommit: "localChange",
			anchorPreview: utils.getFirstLineOfHtml(html, !text.includes('\n')),
			projectName: projectName
		};

        setAnnotationList(annotationList.concat([utils.buildAnnotation(temp, r)]));
		const textEdit = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === temp?.filename)[0];
		// setTempAnno(null);
		setAnnotationList(utils.sortAnnotationsByLocation(annotationList, textEdit.document.uri.toString()));
		view?.updateDisplay(utils.removeOutOfDateAnnotations(annotationList));
		anchor.addHighlightsToEditor(annotationList, textEdit);
    });
}

export const showAnnoInWebview = (id: string) => {
	if(view?._panel?.visible) {
		view?.scrollToAnnotation(id);
	}
	else {
		view?._panel?.reveal();
		view?.scrollToAnnotation(id);
	}

}

export const overriddenClipboardCopyAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
    const annotationsInEditor = annotationList.filter((a: Annotation) => a.filename === textEditor.document.uri.toString());
	const annosInRange = anchor.getAnchorsInRange(textEditor.selection, annotationsInEditor);
	const copiedText = textEditor.document.getText(textEditor.selection)
    if(annosInRange.length) {
        const annoIds = annosInRange.map(a => a.id);
		const { start, end } = textEditor.selection;
		const annosWithCopyMetaData = annosInRange.map(a => {
			return {
					id: a.id,
					anno: annotationList.filter(a => annoIds.includes(a.id))[0],
					offsetInCopy: {
						startLine: a.range.start.line - start.line < 0 ? a.range.start.line : a.range.start.line - start.line,
						startOffset: a.range.start.character - start.character < 0 ? a.range.start.character : a.range.start.character - start.character,
						endLine: a.range.end.line - start.line < 0 ? a.range.end.line : a.range.end.line - start.line,
						endOffset: a.range.end.character
					}
				};
		});
		setCopiedAnnotationList(annosWithCopyMetaData);
    }
	else if(copiedAnnotations.length) {
		setCopiedAnnotationList([]); // we no longer are copying annotations
	}
	
    vscode.env.clipboard.writeText(copiedText);
	setStoredCopyText(copiedText);
}

// probs should merge this with copy - only difference is removing the selection
export const overriddenClipboardCutAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
    const annotationsInEditor = annotationList.filter((a: Annotation) => a.filename === textEditor.document.uri.toString());
	const annosInRange = anchor.getAnchorsInRange(textEditor.selection, annotationsInEditor);
    const copiedText = textEditor.document.getText(textEditor.selection);
	if(annosInRange.length) {
        const annoIds = annosInRange.map(a => a.id);
		const remainingAnnos = annotationList.filter(a => !annoIds.includes(a.id));
		const cutAnnos = annotationList.filter(a => annoIds.includes(a.id));
		anchor.addHighlightsToEditor(remainingAnnos, textEditor);
		const { start, end } = textEditor.selection;
		const annosWithCopyMetaData = annosInRange.map(a => {
			return {
					id: a.id,
					anno: cutAnnos.filter(a => annoIds.includes(a.id))[0],
					offsetInCopy: {
						startLine: a.range.start.line - start.line < 0 ? a.range.start.line : a.range.start.line - start.line,
						startOffset: a.range.start.character - start.character < 0 ? a.range.start.character : a.range.start.character - start.character,
						endLine: a.range.end.line - start.line < 0 ? a.range.end.line : a.range.end.line - start.line,
						endOffset: a.range.end.character
					}
				};
		});
		setCopiedAnnotationList(annosWithCopyMetaData);
    }
	else if(copiedAnnotations.length) {
		setCopiedAnnotationList([]); // we no longer are copying annotations
	}
    vscode.env.clipboard.writeText(copiedText);
	edit.delete(textEditor.selection);
	setStoredCopyText(copiedText);
}

export const overriddenFindAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
	console.log('finding...', textEditor, args, edit);
	vscode.commands.executeCommand('editor.action.startFindReplaceAction')
	// vscode.commands.getCommands().then((value: string[]) => utils.writeConsoleLogToFile(value))
}

export const overridenRevealDefinitionAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
	console.log('this is what we are doing');
	vscode.commands.executeCommand('editor.action.showReferences');
}

