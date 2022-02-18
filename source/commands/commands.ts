import { gitInfo, 
		annotationList, 
		view, 
		user, 
		setView, 
		setTempAnno, 
		setAnnotationList, 
		setCopiedAnnotationList, 
		copiedAnnotations, 
		setStoredCopyText, 
		adamiteLog,
		setGitInfo, 
		gitApi } 
from "../extension";
import Annotation from '../constants/constants';
import * as anchor from '../anchorFunctions/anchor';
import * as vscode from 'vscode';
import * as utils from '../utils/utils';
import ViewLoader from "../view/ViewLoader";
import * as viewHelper from '../viewHelper/viewHelper';
import { v4 as uuidv4 } from 'uuid';
import { initializeAuth } from '../authHelper/authHelper';

export const init = async () => {
	await initializeAuth();

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
						const { id } = message;
						viewHelper.handleScrollInEditor(id);
						break;
					}
					case 'emailAndPassReceived': {
						const { email, pass } = message;
						viewHelper.handleSignInWithEmailAndPassword(email, pass);
						break;
					}
					case 'copyTextFromWebview': {
						const { text } = message;
						viewHelper.handleCopyText(text);
					}
					case 'exportAnnotationAsComment': {
						const { annoId } = message;
						viewHelper.handleExportAnnotationAsComment(annoId);
						break;
					}
					case 'snapshotCode': {
						const { annoId } = message;
						viewHelper.handleSnapshotCode(annoId);
						break;
					}
					case 'createAnnotation': {
						const { anno } = message;
						viewHelper.handleCreateAnnotation(anno);
						break;
					}
					case 'updateAnnotation': {
						const { annoId, key, value } = message;
						viewHelper.handleUpdateAnnotation(annoId, key, value);
						break;
					}
					case 'deleteAnnotation': {
						const { annoId } = message;
						viewHelper.handleDeleteAnnotation(annoId);
						break;
					}
					case 'cancelAnnotation': {
						viewHelper.handleCancelAnnotation();
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
	const newAnnoId: string = uuidv4();
    const r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
    utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then((html: string) => {
		const projectName: string = utils.getProjectName(activeTextEditor.document.uri.fsPath);
		const programmingLang: string = activeTextEditor.document.uri.toString().split('.')[activeTextEditor.document.uri.toString().split('.').length - 1];
		const visiblePath: string = vscode.workspace.workspaceFolders ? 
			utils.getVisiblePath(projectName, activeTextEditor.document.uri.fsPath) : activeTextEditor.document.uri.fsPath;
		const temp = {
			id: newAnnoId,
			filename: activeTextEditor.document.uri.toString(),
			visiblePath,
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
			gitCommit: gitInfo[projectName]?.commit ? gitInfo[projectName]?.commit : "localChange",
			gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
			stableGitUrl: utils.getGithubUrl(visiblePath, projectName, true),
			anchorPreview: utils.getFirstLineOfHtml(html, !text.includes('\n')),
			projectName: projectName,
			githubUsername: gitInfo.author,
			replies: [],
			outputs: [],
			originalCode: html,
			codeSnapshots: [],
			sharedWith: "private"
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
	const newAnnoId: string = uuidv4();
	const programmingLang: string = activeTextEditor.document.uri.toString().split('.')[activeTextEditor.document.uri.toString().split('.').length - 1];
	const visiblePath: string = vscode.workspace.workspaceFolders ? 
		utils.getVisiblePath(projectName, activeTextEditor.document.uri.fsPath) : activeTextEditor.document.uri.fsPath;
	utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then(html => {
		const temp = {
			id: newAnnoId,
			filename: activeTextEditor.document.uri.toString(),
			visiblePath,
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
			gitCommit: gitInfo[projectName]?.commit ? gitInfo[projectName]?.commit : "localChange",
			gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
			stableGitUrl: utils.getGithubUrl(visiblePath, projectName, true),
			anchorPreview: utils.getFirstLineOfHtml(html, !text.includes('\n')),
			projectName: projectName,
			githubUsername: gitInfo.author,
			replies: [],
			outputs: [],
			originalCode: html,
			codeSnapshots: [],
			sharedWith: "private"
		};
        setAnnotationList(annotationList.concat([utils.buildAnnotation(temp, r)]));
		const textEdit = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === temp?.filename)[0];
		setAnnotationList(utils.sortAnnotationsByLocation(annotationList, textEdit.document.uri.toString()));
		// adamiteLog.appendLine('calling viewloader');
		view?.updateDisplay(utils.removeOutOfDateAnnotations(annotationList));
		anchor.addHighlightsToEditor(annotationList, textEdit);
    });
}
// anchor.addHighlightsToEditor(annotationList, textEdit);
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
		const { start } = textEditor.selection;
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
		console.log('annosWithCopyMeta', annosWithCopyMetaData)
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
		if(view) anchor.addHighlightsToEditor(remainingAnnos, textEditor); // why only when view???
		const { start } = textEditor.selection;
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

