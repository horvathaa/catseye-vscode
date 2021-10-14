// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import firebase from './firebase/firebase';
import ViewLoader from './view/ViewLoader';
import Annotation from './constants/constants';
import * as commands from './commands/commands';
import * as eventHandlers from './listeners/listeners';

export let annotationList: Annotation[] = [];
export let copiedAnnotations: Annotation[] = [];
export let deletedAnnotations: Annotation[] = [];
export let outOfDateAnnotations: Annotation[] = [];
export let tabSize: number | string = 4;
export let view: ViewLoader | undefined = undefined;
export let user: firebase.User | null = null;
export let tempAnno: Annotation | null = null;
export let activeEditor = vscode.window.activeTextEditor;
export const annotationDecorations = vscode.window.createTextEditorDecorationType({
	// borderWidth: '0.25px',
	// borderStyle: 'solid',
	overviewRulerLane: vscode.OverviewRulerLane.Right,
	border: '0.5px solid rgba(217, 234, 247, .5)',
	light: {
		// this color will be used in light color themes
		// borderColor: 'darkblue',
		overviewRulerColor: 'darkblue',
	},
	dark: {
		// this color will be used in dark color themes
		// borderColor: ,
		overviewRulerColor: 'lightblue',
	},
	rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
	
});

export const setActiveEditor = (newActiveEditor: vscode.TextEditor | undefined) : void => {
	activeEditor = newActiveEditor;
}

export const setTempAnno = (newAnno: Annotation | null) : void => {
	tempAnno = newAnno;
}

export const setUser = (newUser: firebase.User | null) : void => {
	user = newUser;
}

export const setView = (newView: ViewLoader | undefined) : void => {
	view = newView;
}

export const setTabSize = (newTabSize: number | string) : void => {
	tabSize = newTabSize;
}

export const setAnnotationList = (newAnnotationList: Annotation[]) : void => {
	annotationList = newAnnotationList;
}

export const setCopiedAnnotationList = (newCopiedAnnotationList: Annotation[]) : void => {
	copiedAnnotations = newCopiedAnnotationList;
}

export const setDeletedAnnotationList = (newDeletedAnnotationList: Annotation[]) : void => {
	deletedAnnotations = newDeletedAnnotationList;
}

export const setOutOfDateAnnotationList = (newOutOfDateAnnotationList: Annotation[]) : void => {
	outOfDateAnnotations = newOutOfDateAnnotationList;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	/*************************************************************************************/
	/******************************** EXTENSION LISTENERS  *******************************/
	/*************************************************************************************/
	
	let didChangeVisibleListenerDisposable = vscode.window.onDidChangeVisibleTextEditors(eventHandlers.handleChangeVisibleTextEditors);
	let didChangeactiveEditorListenerDisposable = vscode.window.onDidChangeActiveTextEditor(eventHandlers.handleChangeActiveTextEditor);
	let didChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(eventHandlers.handleDidChangeTextEditorSelection);
	
	let didSaveListenerDisposable = vscode.workspace.onDidSaveTextDocument(eventHandlers.handleDidSaveDidClose);
	let didCloseListenerDisposable = vscode.workspace.onDidCloseTextDocument(eventHandlers.handleDidSaveDidClose)
	let didChangeTextDocumentDisposable = vscode.workspace.onDidChangeTextDocument(eventHandlers.handleDidChangeTextDocument)
	
		
	/*************************************************************************************/
	/**************************************** COMMANDS ***********************************/
	/*************************************************************************************/

	let initDisposable = vscode.commands.registerCommand('adamite.launch', () => commands.init(context));
	let annotateDisposable = vscode.commands.registerCommand('adamite.sel', () => commands.createNewAnnotation());
	let highlightDisposable = vscode.commands.registerCommand('adamite.addHighlight', () => commands.addNewHighlight());

	let copyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', commands.overriddenClipboardCopyAction);
	let cutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', commands.overriddenClipboardCutAction);
	// let findDisposable = vscode.commands.registerTextEditorCommand('actions.find', commands.overriddenFindAction);
	// let revealDisposable = vscode.commands.registerTextEditorCommand('editor.action.revealDefinition', commands.overridenRevealDefinitionAction);

	/*************************************************************************************/
	/**************************************** DISPOSABLES ********************************/
	/*************************************************************************************/

	context.subscriptions.push(initDisposable);
	context.subscriptions.push(annotateDisposable);
	context.subscriptions.push(highlightDisposable);
	context.subscriptions.push(copyDisposable);
	context.subscriptions.push(cutDisposable);
	// context.subscriptions.push(findDisposable);
	// context.subscriptions.push(revealDisposable);
	
	context.subscriptions.push(didChangeVisibleListenerDisposable);
	context.subscriptions.push(didChangeactiveEditorListenerDisposable);
	context.subscriptions.push(didChangeTextEditorSelection);
	context.subscriptions.push(didSaveListenerDisposable);
	context.subscriptions.push(didCloseListenerDisposable);
	context.subscriptions.push(didChangeTextDocumentDisposable);
}

// // this method is called when your extension is deactivated
export function deactivate() {}
