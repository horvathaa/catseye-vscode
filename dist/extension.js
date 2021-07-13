/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");;

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __webpack_require__(1);
class FileState {
    constructor(filename, annotation, anchorStartLine, anchorEndLine, anchorStartOffset, anchorEndOffset) {
        this.filename = filename;
        this.annotation = annotation;
        this.startLine = anchorStartLine;
        this.endLine = anchorEndLine;
        this.startOffset = anchorStartOffset;
        this.endOffset = anchorEndOffset;
    }
}
const translateChanges = (originalStartLine, originalEndLine, originalStartOffset, originalEndOffset, startLine, endLine, startOffset, endOffset, textLength, diff, rangeLength, annotation, filename) => {
    let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };
    const startAndEndLineAreSame = originalStartLine === startLine && originalEndLine === endLine && !diff;
    console.log('original start', originalStartLine, 'startLine', startLine, 'originalEndLine', originalEndLine, 'endLine', endLine);
    if (originalStartLine >= startLine && diff) {
        console.log('in first condition');
        newRange.startLine = originalStartLine + diff;
        newRange.endLine = originalEndLine + diff;
    }
    if (originalStartLine === startLine && startOffset <= originalStartOffset) {
        console.log('in second condition');
        newRange.startOffset = textLength ? originalStartOffset + textLength : originalStartOffset - rangeLength;
        if (startAndEndLineAreSame) {
            console.log('in condition lines are same');
            newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
        }
    }
    if (originalEndLine === endLine && endOffset <= originalEndOffset) {
        console.log('in third condition');
        newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
    }
    if (originalStartLine <= startLine && endLine >= originalEndLine && diff) {
        console.log('in fourth condition');
        newRange.endLine = originalEndLine + diff;
    }
    console.log('making this', newRange);
    return new FileState(filename, annotation, newRange.startLine, newRange.endLine, newRange.startOffset, newRange.endOffset);
};
// add line above range start = startLine++ and endLine++
// delete line above range start = startLine-- and endLine--
// add character(s) before range start on same line = startOffset++ (text length)
// delete character before range start on same line = startOffset-- (text length)
// add character before range end on same line = endOffset++ (text length)
// delete character before range end on same line = endOffset-- (text length)
// add line inbetween range start and range end = endLine++
// delete line inbetween range start and range end = endLine--
// add multiple characters inbetween start and end of range on same line = endOffset + text length
// delete multiple characters inbetween start and end of range on same line = endOffset - text length
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const DECORATOR = vscode.window.createTextEditorDecorationType({
        overviewRulerColor: "rgb(246,232,154)",
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        backgroundColor: '#029aab',
    });
    let highLighted = [];
    let disposableEventListener = vscode.window.onDidChangeActiveTextEditor((textEditor) => {
        console.log('textEditor', textEditor);
    });
    vscode.workspace.onDidChangeTextDocument((e) => {
        // need to get editor using vs.window.visibleTextEditors.find((editor) => ...) by storing URI instead of filename but for now will skip this step and assume the objects in our annotation
        // array map to the current document
        for (const change of e.contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const startOffset = change.range.start.character;
            const endOffset = change.range.end.character + change.text.length;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;
            // if (diff === 0) { continue; }
            console.log('e', e);
            console.log('startline', startLine, 'endLine', endLine, 'diff', diff);
            annotationList = annotationList.map(a => translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, change.text.length, diff, change.rangeLength, a.annotation, a.filename));
            // let newPositions = translateChanges(positions, startLine, endLine, diff, startOffset, endOffset);
            // console.log('newPositions??', newPositions);
        }
    });
    console.log('Congratulations, your extension "adamite" is now active!');
    let code = [];
    let panel = vscode.window.createWebviewPanel('annotating', // Identifies the type of the webview. Used internally
    'ADAMITE', // Title of the panel displayed to the user
    vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
    {
        enableScripts: true
    } // Webview options. More on these later.
    );
    context.subscriptions.push(vscode.commands.registerCommand('adamite.annotate', () => {
        // Create and show a new webview
        panel.webview.html = getWebviewContent("Hello", code);
    }));
    let annotationList = [];
    let disposable = vscode.commands.registerCommand('adamite.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Adamite!');
        let filePath = "";
        if (vscode.workspace.workspaceFolders !== undefined)
            filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.txt';
        vscode.workspace.openTextDocument(filePath).then(doc => {
            console.log('got doc', doc);
            let docText = JSON.parse(doc.getText());
            console.log('doctext', docText);
            docText.forEach((doc) => {
                annotationList.push(new FileState(doc.filename, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset));
            });
            console.log('annotationList', annotationList);
        });
    });
    const annotationDecorations = vscode.window.createTextEditorDecorationType({
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
        }
    });
    let activeEditor = vscode.window.activeTextEditor;
    context.subscriptions.push(vscode.commands.registerCommand('adamite.sel', () => {
        const { activeTextEditor } = vscode.window;
        if (!activeTextEditor) {
            vscode.window.showInformationMessage("No text editor is open!");
            return;
        }
        vscode.window.showInformationMessage(" text editor is open!");
        // const text = activeTextEditor.document.getText(
        // 	activeTextEditor.selection
        // );
        // const { start, end } = activeTextEditor.selection;
        // const range = [new vscode.Range(start, end)];
        // activeTextEditor.setDecorations(DECORATOR, range);
        // console.log('did something', DECORATOR)
        // console.log(text);
        // getSelection();
        // panel.webview.postMessage({
        // 	type: "selected",
        // 	value: text,
        // });
        const text = activeTextEditor.document.getText(activeTextEditor.selection);
        //console.log(text);
        code.push(text);
        for (var i = 0; i < code.length; i++) {
            console.log(i + ": " + code[i]);
        }
        const updateTab = () => {
            panel.webview.html = getWebviewContent(text, code);
        };
        updateTab();
        //var fl = activeTextEditor.document.lineAt(activeTextEditor.selection.active.line);
        //var el = activeTextEditor.document.lineAt(activeTextEditor.selection.active.line);
        var r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
        console.log(r);
        highLighted.push(r);
        if (activeEditor)
            activeEditor.setDecorations(annotationDecorations, highLighted);
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function getWebviewContent(sel, c) {
    console.log('sel', sel);
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
	  <h1>Welcome to the annotation tab, where you can select code and you will see it appear here.</h1>
	  <div id = "annotations">
	  	<h2 id = "lines-of-code-counter">No code selected!</h2>
	  </div>
	  <script>
	  	document.getElementById('lines-of-code-counter').textContent = "${sel}";
		var tag = document.createElement("p");
		tag.textContent = "${sel}";
		document.getElementById("annotations").appendChild(tag);
		var x = document.createElement("INPUT");
		x.setAttribute("type", "text");
  		x.setAttribute("value", "Start Annotating!");
		document.getElementById("annotations").appendChild(x);

	  </script>
  </body>

  </html>`;
}
// // this method is called when your extension is deactivated
// export function deactivate() {}

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map