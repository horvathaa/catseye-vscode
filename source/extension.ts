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
export let view: ViewLoader | undefined = undefined;
export let user: firebase.User | null = null;
export let tempAnno: Annotation | null = null;
export let activeEditor = vscode.window.activeTextEditor;

export const setActiveEditor = (newActiveEditor: vscode.TextEditor | undefined) => {
	activeEditor = newActiveEditor;
}

export const setTempAnno = (newAnno: Annotation | null) => {
	tempAnno = newAnno;
}

export const setUser = (newUser: firebase.User | null) => {
	user = newUser;
}

export const setView = (newView: ViewLoader | undefined) => {
	view = newView;
}

export const setAnnotationList = (newAnnotationList: Annotation[]) => {
	annotationList = newAnnotationList;
}

export const setCopiedAnnotationList = (newCopiedAnnotationList: Annotation[]) => {
	copiedAnnotations = newCopiedAnnotationList;
}

export const annotationDecorations = vscode.window.createTextEditorDecorationType({
	borderWidth: '1px',
	borderStyle: 'solid',
	overviewRulerColor: 'blue',
	overviewRulerLane: vscode.OverviewRulerLane.Right,
	light: {
		// this color will be used in light color themes
		borderColor: 'darkblue'
	},
	dark: {
		// this color will be used in dark color themes
		borderColor: 'lightblue'
	},
	rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
	
});

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	/*************************************************************************************/
	/******************************** EXTENSION LISTENERS  *******************************/
	/*************************************************************************************/
	
	let disposableDidChangeVisibleListener = vscode.window.onDidChangeVisibleTextEditors(eventHandlers.handleChangeVisibleTextEditors);
	let disposableActiveEditorListener = vscode.window.onDidChangeActiveTextEditor(eventHandlers.handleChangeActiveTextEditor);
	let disposableDidSaveListener = vscode.workspace.onDidSaveTextDocument(eventHandlers.handleDidSaveDidClose);
	let disposableDidCloseListener = vscode.workspace.onDidCloseTextDocument(eventHandlers.handleDidSaveDidClose)
	let disposableDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(eventHandlers.handleDidChangeTextDocument)
		
	/*************************************************************************************/
	/**************************************** COMMANDS ***********************************/
	/*************************************************************************************/

	let initDisposable = vscode.commands.registerCommand('adamite.helloWorld', () => commands.init(context));
	let clipboardDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', commands.overriddenClipboardCopyAction);
	let annotateDisposable = vscode.commands.registerCommand('adamite.sel', () => commands.createNewAnnotation());

	/*************************************************************************************/
	/**************************************** DISPOSABLES ********************************/
	/*************************************************************************************/

	context.subscriptions.push(initDisposable);
	context.subscriptions.push(clipboardDisposable);
	context.subscriptions.push(annotateDisposable);
	
	context.subscriptions.push(disposableDidChangeVisibleListener);
	context.subscriptions.push(disposableActiveEditorListener);
	context.subscriptions.push(disposableDidSaveListener);
	context.subscriptions.push(disposableDidCloseListener);
	context.subscriptions.push(disposableDidChangeTextDocument);
}

// // this method is called when your extension is deactivated
export function deactivate() {}
