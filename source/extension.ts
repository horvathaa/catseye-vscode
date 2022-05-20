// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import firebase from './firebase/firebase';
import { Annotation, ChangeEvent } from './constants/constants';
import * as commands from './commands/commands';
import * as eventHandlers from './listeners/listeners';
import * as utils from './utils/utils';
import * as debug from './debug/debug';
import ViewLoader from './view/ViewLoader';
// console.log('window activeColorTheme', vscode.window.activeColorTheme);
// console.log('config', vscode.workspace.getConfiguration('workbench', vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri))
// import { AdamiteTerminalLinkProvider } from './adamiteTerminalLinkProvider/adamiteTerminalLinkProvider';
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
export const gitApi = gitExtension?.getAPI(1);
export let gitInfo: {[key: string] : any} = {};
export let annotationList: Annotation[] = [];
export let copiedAnnotations:  {[key: string] : any }[] = [];
export let deletedAnnotations: Annotation[] = [];
export let outOfDateAnnotations: Annotation[] = [];
export let selectedAnnotationsNavigations: {[key: string] : any }[] = [];
export let storedCopyText: string = "";
export let tabSize: number | string = 4;
export let insertSpaces: boolean | string = true; // not sure what to have as default here... VS Code API doesn't say what the default is lol 
export let view: ViewLoader | undefined = undefined;
export let user: firebase.User | null = null;
export let tempAnno: Annotation | null = null;
export let activeEditor = vscode.window.activeTextEditor;
export let currentColorTheme: string = vscode.workspace.getConfiguration('workbench', vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri).colorTheme;
// console.log('currentColorTheme', currentColorTheme);
export let adamiteLog = vscode.window.createOutputChannel("Adamite");
export let changes: ChangeEvent[] = [];
export let numChangeEventsCompleted = 0;

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

export const setCurrentColorTheme = (newCurrentColorTheme: string) : void => {
	currentColorTheme = newCurrentColorTheme;
}

export const setDeletedAnnotationList = (newDeletedAnnotationList: Annotation[]) : void => {
	deletedAnnotations = newDeletedAnnotationList;
	setAnnotationList(utils.removeOutOfDateAnnotations(annotationList));
}

export const setOutOfDateAnnotationList = (newOutOfDateAnnotationList: Annotation[]) : void => {
	outOfDateAnnotations = newOutOfDateAnnotationList;
	setAnnotationList(utils.removeOutOfDateAnnotations(annotationList));
}

export const setSelectedAnnotationsNavigations = (newSelectedAnnotationsNavigationList: {[key: string] : any }[]) => {
	selectedAnnotationsNavigations = newSelectedAnnotationsNavigationList;
}

export const setChangeEvents = (newChangeEvents: ChangeEvent[]) : void => {
	changes = newChangeEvents;
}

export const incrementNumChangeEventsCompleted = () : void => {
	numChangeEventsCompleted++;
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	adamiteLog.appendLine('Starting activate');
	// initialize authentication and listeners for annotations
	commands.init();

	/*************************************************************************************/
	/******************************** EXTENSION LISTENERS  *******************************/
	/*************************************************************************************/
	
	let didChangeVisibleListenerDisposable = vscode.window.onDidChangeVisibleTextEditors(eventHandlers.handleChangeVisibleTextEditors);
	let didChangeActiveEditorListenerDisposable = vscode.window.onDidChangeActiveTextEditor(eventHandlers.handleChangeActiveTextEditor);
	let didChangeActiveColorTheme = vscode.window.onDidChangeActiveColorTheme(eventHandlers.handleDidChangeActiveColorTheme);

	let didSaveListenerDisposable = vscode.workspace.onDidSaveTextDocument(eventHandlers.handleDidSaveDidClose);
	let didCloseListenerDisposable = vscode.workspace.onDidCloseTextDocument(eventHandlers.handleDidSaveDidClose)
	let didChangeTextDocumentDisposable = vscode.workspace.onDidChangeTextDocument(eventHandlers.handleDidChangeTextDocument)
	

	let didStartDebugSessionDisposable = vscode.debug.onDidStartDebugSession(debug.handleOnDidStartDebugSession);

	/*************************************************************************************/
	/**************************************** COMMANDS ***********************************/
	/*************************************************************************************/

	let createViewDisposable = vscode.commands.registerCommand('adamite.launch', () => commands.createView(context));
	let annotateDisposable = vscode.commands.registerCommand('adamite.addAnnotation', () => commands.createNewAnnotation());
	let annotateFileDisposable = vscode.commands.registerCommand('adamite.addFileAnnotation', (context: any) => commands.createFileAnnotation(context));
	let highlightDisposable = vscode.commands.registerCommand('adamite.addHighlight', () => commands.addNewHighlight());
	let selectedDisposable = vscode.commands.registerCommand('adamite.addSelectedAnnotation', () => commands.addNewSelectedAnnotation());
	let navigateForwardSelectedDisposable = vscode.commands.registerCommand('adamite.navigateForward', () => commands.navigateSelectedAnnotations('forward'));
	let navigateBackSelectedDisposable = vscode.commands.registerCommand('adamite.navigateBack', () => commands.navigateSelectedAnnotations('back'));
	let scrollDisposable = vscode.commands.registerCommand('adamite.showAnnoInWebview', (id) => commands.showAnnoInWebview(id));

	// let copyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', commands.overriddenClipboardCopyAction);
	// let cutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', commands.overriddenClipboardCutAction);

	vscode.commands.executeCommand('setContext', 'adamite.showAnchorMenuOptions', true);


	/*************************************************************************************/
	/**************************************** PROVIDERS *********************************/
	/*************************************************************************************/

	// let terminalLinkProviderDisposable = vscode.window.registerTerminalLinkProvider(new AdamiteTerminalLinkProvider());

	/*************************************************************************************/
	/**************************************** DISPOSABLES ********************************/
	/*************************************************************************************/

	context.subscriptions.push(didChangeVisibleListenerDisposable);
	context.subscriptions.push(didChangeActiveEditorListenerDisposable);
	context.subscriptions.push(didChangeActiveColorTheme);
	context.subscriptions.push(didSaveListenerDisposable);
	context.subscriptions.push(didCloseListenerDisposable);
	context.subscriptions.push(didChangeTextDocumentDisposable);
	context.subscriptions.push(didStartDebugSessionDisposable);

	context.subscriptions.push(createViewDisposable);
	context.subscriptions.push(annotateDisposable);
	context.subscriptions.push(annotateFileDisposable);
	context.subscriptions.push(highlightDisposable);
	context.subscriptions.push(selectedDisposable);
	context.subscriptions.push(navigateForwardSelectedDisposable);
	context.subscriptions.push(navigateBackSelectedDisposable);
	context.subscriptions.push(scrollDisposable);
	// context.subscriptions.push(copyDisposable);
	// context.subscriptions.push(cutDisposable);
	
	// context.subscriptions.push(terminalLinkProviderDisposable);
	
}

// // this method is called when your extension is deactivated
export function deactivate() {}
