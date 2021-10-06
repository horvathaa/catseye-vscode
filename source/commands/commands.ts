import { annotationList, view, user, setUser, setView, tempAnno, setTempAnno, annotationDecorations, setAnnotationList, setCopiedAnnotationList } from "../extension";
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
			if(view) {
				view._panel?.reveal();
			}
			else {
				const newView = new ViewLoader(vscode.workspace.workspaceFolders[0].uri, context.extensionPath);
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
											vscode.window.showTextDocument(doc, { preserveFocus: true, preview: true, selection: range, viewColumn: vscode.ViewColumn.Beside });
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
									annotationsRef.where('authorId', '==', result.user.uid).where('deleted', '==', false).get().then((snapshot: firebase.firestore.QuerySnapshot) => {
										const annoDocs = utils.getListFromSnapshots(snapshot);
										const annotations: Annotation[] = annoDocs && annoDocs.length ? annoDocs.map((a: any) => {
											return utils.buildAnnotation(a);
										}) : [];
										setAnnotationList(utils.sortAnnotationsByLocation(annotations, vscode.window.activeTextEditor?.document.uri.path.toString()));
										if(vscode.workspace.workspaceFolders)
											view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
										const annoFiles: string[] = annotations.map(a => a.filename.toString());
										vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
											if(annoFiles.includes(v.document.uri.toString())) {
												addHighlightsToEditor(annotations, v); 
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
										if(vscode.workspace.workspaceFolders)
											view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
										addHighlightsToEditor(annotationList, text);
									}

								});
								break;
							}
							case 'updateAnnotation': {
								const updatedAnno = utils.buildAnnotation({ ...annotationList.filter(a => a.id === message.annoId)[0], annotation: message.newAnnoContent });
								const updatedList = annotationList.filter(a => a.id !== message.annoId).concat([updatedAnno]);
								const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === updatedAnno?.filename)[0];
								setAnnotationList(utils.sortAnnotationsByLocation(updatedList, text.document.uri.toString()));
								if(vscode.workspace.workspaceFolders)
									view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
								break;
							}
							case 'deleteAnnotation': {
								const updatedAnno = utils.buildAnnotation({ ...annotationList.filter(a => a.id === message.annoId)[0], deleted: true });
								const updatedList = annotationList.filter(a => a.id !== message.annoId).concat([updatedAnno]);
								utils.saveAnnotations(updatedList, ""); // bad - that should point to JSON but we are also not using that rn so whatever
								setAnnotationList(updatedList.filter(a => a.id !== message.annoId));
								if(vscode.workspace.workspaceFolders)
									view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
								break;
							}
							case 'cancelAnnotation': {
								// reset temp object and re-render
								setTempAnno(null);
								view?.updateDisplay(annotationList, vscode.window.activeTextEditor?.document.fileName.toString());
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
							if(vscode.workspace.workspaceFolders && !e.webviewPanel.active)
								view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
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
    utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then(html => {
		const temp = {
			id: uuidv4(),
			filename: activeTextEditor.document.uri.toString(),
			visiblePath: vscode.workspace.workspaceFolders ? 
				utils.getVisiblePath(activeTextEditor.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath) :
				activeTextEditor.document.uri.fsPath,
			anchorText: text,
			annotation: '',
			deleted: false,
			html,
			programmingLang: activeTextEditor.document.uri.toString().split('.')[1],
			createdTimestamp: new Date().getTime(),
			authorId: user?.uid
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
    utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then(html => {
		const temp = {
			id: uuidv4(),
			filename: activeTextEditor.document.uri.toString(),
			visiblePath: vscode.workspace.workspaceFolders ? 
				utils.getVisiblePath(activeTextEditor.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath) :
				activeTextEditor.document.uri.fsPath,
			anchorText: text,
			annotation: '',
			deleted: false,
			html,
			programmingLang: activeTextEditor.document.uri.toString().split('.')[1],
			createdTimestamp: new Date().getTime(),
			authorId: user?.uid
		};
		// setTempAnno(utils.buildAnnotation(temp, r));
        setAnnotationList(annotationList.concat([utils.buildAnnotation(temp, r)]));
		const textEdit = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === temp?.filename)[0];
		// setTempAnno(null);
		setAnnotationList(utils.sortAnnotationsByLocation(annotationList, textEdit.document.uri.toString()));
		if(vscode.workspace.workspaceFolders)
			view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
		addHighlightsToEditor(annotationList, textEdit);
    });
}

export const overriddenClipboardCopyAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
    const annotationsInEditor = annotationList.filter((a: Annotation) => a.filename === textEditor.document.uri.toString());
    const annosInRange = anchor.getAnchorsInRange(textEditor.selection, annotationsInEditor);
    if(annosInRange.length) {
        const annoIds = annosInRange.map(a => a.id)
        setCopiedAnnotationList(annotationList.filter(a => annoIds.includes(a.id)));
    }
    vscode.env.clipboard.writeText(textEditor.document.getText(textEditor.selection));

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

export const addHighlightsToEditor = (annotationList: Annotation[], text: vscode.TextEditor | undefined) : void => {
	const filenames = [... new Set(annotationList.map(a => a.filename))];
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