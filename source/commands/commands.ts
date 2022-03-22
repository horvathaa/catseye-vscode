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
		gitApi,
		selectedAnnotationsNavigations, 
		setSelectedAnnotationsNavigations} 
from "../extension";
import { AnchorObject, Annotation } from '../constants/constants';
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

export const createView = async (context: vscode.ExtensionContext) => {
	if(vscode.workspace.workspaceFolders) {
		if(view) {
			view._panel?.reveal();
			return;
		}

		const newView : ViewLoader = new ViewLoader(vscode.workspace.workspaceFolders[0].uri, context.extensionPath);
		setView(newView);
		if(newView) {
	/***********************************************************************************/
	/**************************************** VIEW LISTENERS ******************************/
	/*************************************************************************************/
			newView._panel?.webview.onDidReceiveMessage((message) => {
				switch(message.command) {
					case 'scrollInEditor': {
						const { id, anchorId } = message;
						viewHelper.handleScrollInEditor(id, anchorId);
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
					case 'addAnchor': {
						const { annoId } = message;
						viewHelper.handleAddAnchor(annoId);
						break;
					}
					case 'snapshotCode': {
						const { annoId, anchorId } = message;
						viewHelper.handleSnapshotCode(annoId, anchorId);
						break;
					}
					case 'createAnnotation': {
						const { anno, willBePinned } = message;
						viewHelper.handleCreateAnnotation(anno, willBePinned);
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
					case 'saveAnnotationsToJson': {
						viewHelper.handleSaveAnnotationsToJson();
						break;
					}
					case 'showKeyboardShortcuts': {
						viewHelper.handleShowKeyboardShortcuts();
						break;
					}
					default: {
						break;
					}		
				}
			});

			anchor.addHighlightsToEditor(annotationList, vscode.window.activeTextEditor);
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
    if(!view) {
		vscode.commands.executeCommand('adamite.launch');
	}
	else if(!view?._panel?.visible) {
		view?._panel?.reveal(vscode.ViewColumn.Beside);
	} 
    const text = activeTextEditor.document.getText(activeTextEditor.selection);
	const newAnnoId: string = uuidv4();
    const r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
    utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then((html: string) => {
		const projectName: string = utils.getProjectName(activeTextEditor.document.uri.fsPath);
		const programmingLang: string = activeTextEditor.document.uri.toString().split('.')[activeTextEditor.document.uri.toString().split('.').length - 1];
		const visiblePath: string = vscode.workspace.workspaceFolders ? 
			utils.getVisiblePath(projectName, activeTextEditor.document.uri.fsPath) : activeTextEditor.document.uri.fsPath;
		const anchorObject: AnchorObject = {
			anchor: anchor.createAnchorFromRange(r),
			anchorText: text,
			html,
			filename: activeTextEditor.document.uri.toString(),
			gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
			stableGitUrl: utils.getGithubUrl(visiblePath, projectName, true),
			anchorPreview: utils.getFirstLineOfHtml(html, !text.includes('\n')),
			visiblePath,
			anchorId: uuidv4(),
			originalCode: html,
			parentId: newAnnoId,
			programmingLang
		}
		const temp = {
			id: newAnnoId,
			anchors: [anchorObject],
			annotation: '',
			deleted: false,
			outOfDate: false,
			createdTimestamp: new Date().getTime(),
			authorId: user?.uid,
			gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : "",
			gitBranch: gitInfo[projectName]?.branch ? gitInfo[projectName]?.branch : "",
			gitCommit: gitInfo[projectName]?.commit ? gitInfo[projectName]?.commit : "localChange",
			projectName: projectName,
			githubUsername: gitInfo.author,
			replies: [],
			outputs: [],
			codeSnapshots: [],
			sharedWith: "private",
			selected: false,
			needToUpdate: true
		};
		setTempAnno(utils.buildAnnotation(temp));
        view?.createNewAnno(html, annotationList);
    });
}

export const addNewHighlight = (selected?: boolean) : string | Promise<string> => {
	const { activeTextEditor } = vscode.window;
    if (!activeTextEditor) {
        vscode.window.showInformationMessage("No text editor is open!");
        return "";
    }
	if(!view) {
		vscode.commands.executeCommand('adamite.launch');
	}
	else if(!view?._panel?.visible) {
		view?._panel?.reveal(vscode.ViewColumn.Beside);
	}   
    const text = activeTextEditor.document.getText(activeTextEditor.selection);
	const r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
	const projectName: string = utils.getProjectName(activeTextEditor.document.uri.fsPath);
	// Get the branch and commit 
	const newAnnoId: string = uuidv4();
	// console.log('is this undefined???', activeTextEditor.document.uri.toString().split('.'));
	const programmingLang: string = activeTextEditor.document.uri.toString().split('.')[activeTextEditor.document.uri.toString().split('.').length - 1];
	const visiblePath: string = vscode.workspace.workspaceFolders ? 
		utils.getVisiblePath(projectName, activeTextEditor.document.uri.fsPath) : activeTextEditor.document.uri.fsPath;
	return utils.getShikiCodeHighlighting(activeTextEditor.document.uri.toString(), text).then(html => {
		const anchorObject: AnchorObject = {
			anchor: anchor.createAnchorFromRange(r),
			anchorText: text,
			html,
			filename: activeTextEditor.document.uri.toString(),
			gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
			stableGitUrl: utils.getGithubUrl(visiblePath, projectName, true),
			anchorPreview: utils.getFirstLineOfHtml(html, !text.includes('\n')),
			visiblePath,
			anchorId: uuidv4(),
			originalCode: html,
			parentId: newAnnoId,
			programmingLang
		}
		const temp = {
			id: newAnnoId,
			anchors: [anchorObject],
			annotation: '',
			deleted: false,
			outOfDate: false,
			createdTimestamp: new Date().getTime(),
			authorId: user?.uid,
			gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : "",
			gitBranch: gitInfo[projectName]?.branch ? gitInfo[projectName]?.branch : "",
			gitCommit: gitInfo[projectName]?.commit ? gitInfo[projectName]?.commit : "localChange",
			projectName: projectName,
			githubUsername: gitInfo.author,
			replies: [],
			outputs: [],
			codeSnapshots: [],
			sharedWith: "private",
			selected: selected ? selected : false,
			needToUpdate: true
		};
        setAnnotationList(annotationList.concat([utils.buildAnnotation(temp)]));
		// const textEdit = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === temp?.filename)[0];
		// setAnnotationList(utils.sortAnnotationsByLocation(annotationList, textEdit.document.uri.toString()));
		// adamiteLog.appendLine('calling viewloader');
		view?.updateDisplay(utils.removeOutOfDateAnnotations(annotationList));
		anchor.addHighlightsToEditor(annotationList, activeTextEditor);
		return newAnnoId;
	});
}

export const addNewSelectedAnnotation = async () : Promise<void> => {
	const id: string = await addNewHighlight(true);
	setSelectedAnnotationsNavigations([...selectedAnnotationsNavigations, { id, anchorId: annotationList.find(a => a.id === id)?.anchors[0].anchorId, lastVisited: false}]);
}

export const navigateSelectedAnnotations = (direction: string) : void => {
	// addNewHighlight(true);
	console.log('selectedAnnotationsNavigations', selectedAnnotationsNavigations);
	let lastVisited: number = selectedAnnotationsNavigations.findIndex(a => a.lastVisited);
	if(lastVisited === -1) {
		const id: string = selectedAnnotationsNavigations[0].id;
		const anchorId: string = selectedAnnotationsNavigations[0].anchorId;
		viewHelper.handleScrollInEditor(id, anchorId);
		selectedAnnotationsNavigations[0].lastVisited = true;
		return;
	}
	const selectedAnno: Annotation | undefined = annotationList.find(a => a.id === selectedAnnotationsNavigations[lastVisited].id);
	
	const anchorIdx: number | undefined = selectedAnno?.anchors.findIndex(a => a.anchorId === selectedAnnotationsNavigations[lastVisited].anchorId); 
	if(selectedAnno && anchorIdx !== undefined && anchorIdx !== -1) {
		let newAnchorIdx: number = direction === 'forward' ? 
						anchorIdx + 1 < selectedAnno.anchors.length ? 
						anchorIdx + 1 : 
						-1 :
						anchorIdx - 1 >= 0 ?
						anchorIdx - 1 :
						-2;
		let id = "", anchorId = "";
		// switching to next annotation in list
		if(newAnchorIdx === -1 || newAnchorIdx === -2) {
			selectedAnnotationsNavigations[lastVisited].lastVisited = false;
			lastVisited = newAnchorIdx === -1 ? lastVisited + 1 < selectedAnnotationsNavigations.length ? 
				lastVisited + 1 : 
				0 :
				lastVisited - 1 >= 0 ?
				lastVisited - 1 :
				selectedAnnotationsNavigations.length - 1;
			id = selectedAnnotationsNavigations[lastVisited].id;
			const newAnno: Annotation | undefined = annotationList.find(a => a.id === selectedAnnotationsNavigations[lastVisited].id);
			newAnchorIdx = newAnchorIdx === -1 ? 0 : newAnno ? newAnno.anchors.length - 1 : 0;
			selectedAnnotationsNavigations[lastVisited].lastVisited = true;
			selectedAnnotationsNavigations[lastVisited].anchorId = newAnno?.anchors[newAnchorIdx].anchorId;
			anchorId = selectedAnnotationsNavigations[lastVisited].anchorId;
		}
		// staying within annotation 
		else {
			id = selectedAnno.id;
			anchorId = selectedAnno.anchors[newAnchorIdx].anchorId;
			selectedAnnotationsNavigations[lastVisited].anchorId = anchorId;
		}
		viewHelper.handleScrollInEditor(id, anchorId);
	}
	// const newIdx: number = direction === 'forward' ? 
	// 					lastVisited + 1 < selectedAnnotationsNavigations.length ? 
	// 					lastVisited + 1 : 
	// 					0 :
	// 					lastVisited - 1 >= 0 ?
	// 					lastVisited - 1 :
	// 					selectedAnnotationsNavigations.length - 1;
	// // console.log('newIdx', newIdx);
	// const id: string = selectedAnnotationsNavigations[newIdx].id;
	

	// selectedAnnotationsNavigations[lastVisited].lastVisited = false;
	// selectedAnnotationsNavigations[newIdx].lastVisited = true;
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
    const annotationsInEditor = utils.getAnnotationsInFile(annotationList, textEditor.document.uri.toString());
	const anchorsInRange = anchor.getAnchorsInRange(textEditor.selection, annotationsInEditor);
	const copiedText = textEditor.document.getText(textEditor.selection)
    if(anchorsInRange.length) {
        const annoIds = anchorsInRange.map(a => a.anchor.parentId);
		const { start } = textEditor.selection;
		const annosWithCopyMetaData = anchorsInRange.map(a => {
			return {
					anchor: a.anchor,
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
	const annotationsInEditor = utils.getAnnotationsInFile(annotationList, textEditor.document.uri.toString());
	const anchorsInRange = anchor.getAnchorsInRange(textEditor.selection, annotationsInEditor);
    const copiedText = textEditor.document.getText(textEditor.selection);
	if(anchorsInRange.length) {
        const annoIds = anchorsInRange.map(a => a.anchor.parentId);
		const remainingAnnos = annotationList.filter(id => !annoIds.includes(id));
		const cutAnnos = annotationList.filter(id => annoIds.includes(id));
		if(view) anchor.addHighlightsToEditor(remainingAnnos, textEditor); // why only when view???
		const { start } = textEditor.selection;
		const annosWithCopyMetaData = anchorsInRange.map(a => {
			return {
					anchor: a.anchor,
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

