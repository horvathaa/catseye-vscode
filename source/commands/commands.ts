import { gitInfo, annotationList, view, user, setUser, setView, tempAnno, setTempAnno, annotationDecorations, setAnnotationList, setCopiedAnnotationList, copiedAnnotations, setStoredCopyText, setGitInfo, gitApi } from "../extension";
import Annotation from '../constants/constants';
import * as anchor from '../anchorFunctions/anchor';
import * as vscode from 'vscode';
import * as utils from '../utils/utils';
import ViewLoader from "../view/ViewLoader";
import * as viewHelper from '../viewHelper/viewHelper';
import { v4 as uuidv4 } from 'uuid';
import { initializeAuth } from '../authHelper/authHelper';

export const init = () => {
	setGitInfo(utils.generateGitMetaData(gitApi));
	initializeAuth();
	if(view) {
		view._panel?.reveal();
	}
}

export const createView = (context: vscode.ExtensionContext) => {
	if(vscode.workspace.workspaceFolders) {
		const newView : ViewLoader = new ViewLoader(vscode.workspace.workspaceFolders[0].uri, context.extensionPath);
		setView(newView);
		if(newView) {
	/***********************************************************************************/
	/**************************************** VIEW LISTENERS ******************************/
	/*************************************************************************************/
			newView._panel?.webview.onDidReceiveMessage((message) => {
				switch(message.command) {
					case 'scrollInEditor': {
						viewHelper.scrollInEditor(message.id);
						break;
					}
					case 'emailAndPassReceived': {
						const { email, pass } = message;
						viewHelper.handleSignInWithEmailAndPassword(email, pass);
						break;
					}
					case 'createAnnotation': {
						viewHelper.createAnnotation(message.anno);
						break;
					}
					case 'updateAnnotation': {
						viewHelper.updateAnnotation(message.annoId, message.newAnnoContent);
						break;
					}
					case 'deleteAnnotation': {
						viewHelper.deleteAnnotation(message.annoId);
						break;
					}
					case 'cancelAnnotation': {
						viewHelper.cancelAnnotation();
						break;
					}
					default: {
						break;
					}		
				}
			});

			newView._panel?.onDidDispose((e: void) => {
				viewHelper.handleOnDidDispose();
			}, null, context.subscriptions);

			newView._panel?.onDidChangeViewState((e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
				viewHelper.handleOnDidChangeViewState();
			});
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
		if(view) anchor.addHighlightsToEditor(remainingAnnos, textEditor);
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

