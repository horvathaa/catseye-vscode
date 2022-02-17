// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
vscode.window.showInformationMessage("LOADING EXTENSION.TS");
import firebase from './firebase/firebase';
vscode.window.showInformationMessage("LOADED FIREBASE");
import ViewLoader from './view/ViewLoader';
vscode.window.showInformationMessage("LOADED VIEWLOADER");
import Annotation from './constants/constants';
vscode.window.showInformationMessage("LOADED CONSTANTS");
import * as commands from './commands/commands';
vscode.window.showInformationMessage("LOADED COMMANDS");
import * as eventHandlers from './listeners/listeners';
vscode.window.showInformationMessage("LOADED LISTENERS");
import * as utils from './utils/utils';
vscode.window.showInformationMessage("LOADED UTILS");
// import { AdamiteTerminalLinkProvider } from './adamiteTerminalLinkProvider/adamiteTerminalLinkProvider';
vscode.window.showInformationMessage("ABOUT TO LOAD vscode.git exports");
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
console.log('gitExtension', gitExtension);
vscode.window.showInformationMessage("GOT GIT EXTENSION?");
export const gitApi = gitExtension?.getAPI(1);
export let gitInfo: {[key: string] : any} = {};
export let annotationList: Annotation[] = [];
export let copiedAnnotations:  {[key: string] : any }[] = [];
export let deletedAnnotations: Annotation[] = [];
export let outOfDateAnnotations: Annotation[] = [];
export let storedCopyText: string = "";
export let tabSize: number | string = 4;
export let insertSpaces: boolean | string = true; // not sure what to have as default here... VS Code API doesn't say what the default is lol 
export let view: ViewLoader | undefined = undefined;
export let user: firebase.User | null = null;
export let tempAnno: Annotation | null = null;
export let activeEditor = vscode.window.activeTextEditor;
export const annotationDecorations = vscode.window.createTextEditorDecorationType({
	// borderWidth: '0.25px',
	// borderStyle: 'solid',
	overviewRulerLane: vscode.OverviewRulerLane.Right,
	border: '0.15px solid rgba(217, 234, 247, .25)',
	light: {
		// this color will be used in light color themes
		// borderColor: 'darkblue',
		overviewRulerColor: 'darkgreen',
	},
	dark: {
		// this color will be used in dark color themes
		// borderColor: ,
		overviewRulerColor: 'lightgreen',
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

export const setGitInfo = (newGiftInfo: {[key: string] : any}) : void => {
	gitInfo = newGiftInfo;
}

export const setTabSize = (newTabSize: number | string) : void => {
	tabSize = newTabSize;
}

export const setInsertSpaces = (newInsertSpaces: boolean | string) : void => {
	insertSpaces = newInsertSpaces;
}

export const setAnnotationList = (newAnnotationList: Annotation[]) : void => {
	annotationList = newAnnotationList;
}

export const setCopiedAnnotationList = (newCopiedAnnotationList: {[key: string] : any }[]) : void => {
	copiedAnnotations = newCopiedAnnotationList;
}

export const setStoredCopyText = (newCopyText: string) : void => {
	storedCopyText = newCopyText;
}

export const setDeletedAnnotationList = (newDeletedAnnotationList: Annotation[]) : void => {
	deletedAnnotations = newDeletedAnnotationList;
	setAnnotationList(utils.removeOutOfDateAnnotations(annotationList));
}

export const setOutOfDateAnnotationList = (newOutOfDateAnnotationList: Annotation[]) : void => {
	outOfDateAnnotations = newOutOfDateAnnotationList;
	setAnnotationList(utils.removeOutOfDateAnnotations(annotationList));
}

vscode.window.showInformationMessage("FINISHED SETTERS");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage("RUNNING ACTIVATE");
	// initialize authentication and listeners for annotations
	commands.init();

	/*************************************************************************************/
	/******************************** EXTENSION LISTENERS  *******************************/
	/*************************************************************************************/
	
	let didChangeVisibleListenerDisposable = vscode.window.onDidChangeVisibleTextEditors(eventHandlers.handleChangeVisibleTextEditors);
	let didChangeActiveEditorListenerDisposable = vscode.window.onDidChangeActiveTextEditor(eventHandlers.handleChangeActiveTextEditor);
	let didChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(eventHandlers.handleDidChangeTextEditorSelection);
	
	let didSaveListenerDisposable = vscode.workspace.onDidSaveTextDocument(eventHandlers.handleDidSaveDidClose);
	let didCloseListenerDisposable = vscode.workspace.onDidCloseTextDocument(eventHandlers.handleDidSaveDidClose)
	let didChangeTextDocumentDisposable = vscode.workspace.onDidChangeTextDocument(eventHandlers.handleDidChangeTextDocument)
	
	// let didStartDebugSessionDisposable = vscode.debug.onDidStartDebugSession(eventHandlers.handleDidStartDebugSession);

	/*************************************************************************************/
	/**************************************** COMMANDS ***********************************/
	/*************************************************************************************/

	let createViewDisposable = vscode.commands.registerCommand('adamite.launch', () => commands.createView(context));
	let annotateDisposable = vscode.commands.registerCommand('adamite.addAnnotation', () => commands.createNewAnnotation());
	let highlightDisposable = vscode.commands.registerCommand('adamite.addHighlight', () => commands.addNewHighlight());
	let scrollDisposable = vscode.commands.registerCommand('adamite.showAnnoInWebview', (id) => commands.showAnnoInWebview(id));

	let copyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', commands.overriddenClipboardCopyAction);
	let cutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', commands.overriddenClipboardCutAction);


	/*************************************************************************************/
	/**************************************** PROVIDERS *********************************/
	/*************************************************************************************/

	// let terminalLinkProviderDisposable = vscode.window.registerTerminalLinkProvider(new AdamiteTerminalLinkProvider());

	/*************************************************************************************/
	/**************************************** DISPOSABLES ********************************/
	/*************************************************************************************/

	context.subscriptions.push(didChangeVisibleListenerDisposable);
	context.subscriptions.push(didChangeActiveEditorListenerDisposable);
	context.subscriptions.push(didChangeTextEditorSelection);
	context.subscriptions.push(didSaveListenerDisposable);
	context.subscriptions.push(didCloseListenerDisposable);
	context.subscriptions.push(didChangeTextDocumentDisposable);

	context.subscriptions.push(createViewDisposable);
	context.subscriptions.push(annotateDisposable);
	context.subscriptions.push(highlightDisposable);
	context.subscriptions.push(scrollDisposable);
	context.subscriptions.push(copyDisposable);
	context.subscriptions.push(cutDisposable);
	
	// context.subscriptions.push(terminalLinkProviderDisposable);
	
}

vscode.window.showInformationMessage("FINISHED ACTIVATE.TS");

// // this method is called when your extension is deactivated
export function deactivate() {}
vscode.window.showInformationMessage("AT BOTTOM OF EXTENSION.TS");