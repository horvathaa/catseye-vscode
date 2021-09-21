"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.annotationDecorations = exports.setCopiedAnnotationList = exports.setAnnotationList = exports.setView = exports.setUser = exports.setTempAnno = exports.setActiveEditor = exports.activeEditor = exports.tempAnno = exports.user = exports.view = exports.copiedAnnotations = exports.annotationList = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const commands = require("./commands/commands");
const eventHandlers = require("./listeners/listeners");
exports.annotationList = [];
exports.copiedAnnotations = [];
exports.view = undefined;
exports.user = null;
exports.tempAnno = null;
exports.activeEditor = vscode.window.activeTextEditor;
const setActiveEditor = (newActiveEditor) => {
    exports.activeEditor = newActiveEditor;
};
exports.setActiveEditor = setActiveEditor;
const setTempAnno = (newAnno) => {
    exports.tempAnno = newAnno;
};
exports.setTempAnno = setTempAnno;
const setUser = (newUser) => {
    exports.user = newUser;
};
exports.setUser = setUser;
const setView = (newView) => {
    exports.view = newView;
};
exports.setView = setView;
const setAnnotationList = (newAnnotationList) => {
    exports.annotationList = newAnnotationList;
};
exports.setAnnotationList = setAnnotationList;
const setCopiedAnnotationList = (newCopiedAnnotationList) => {
    exports.copiedAnnotations = newCopiedAnnotationList;
};
exports.setCopiedAnnotationList = setCopiedAnnotationList;
exports.annotationDecorations = vscode.window.createTextEditorDecorationType({
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
function activate(context) {
    /*************************************************************************************/
    /******************************** EXTENSION LISTENERS  *******************************/
    /*************************************************************************************/
    let disposableDidChangeVisibleListener = vscode.window.onDidChangeVisibleTextEditors(eventHandlers.handleChangeVisibleTextEditors);
    let disposableActiveEditorListener = vscode.window.onDidChangeActiveTextEditor(eventHandlers.handleChangeActiveTextEditor);
    let disposableDidSaveListener = vscode.workspace.onDidSaveTextDocument(eventHandlers.handleDidSaveDidClose);
    let disposableDidCloseListener = vscode.workspace.onDidCloseTextDocument(eventHandlers.handleDidSaveDidClose);
    let disposableDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(eventHandlers.handleDidChangeTextDocument);
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
exports.activate = activate;
// // this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map