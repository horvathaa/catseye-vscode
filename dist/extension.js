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
let selectionRangeProviderDisposable;
// function registerSelectionRangeProvider() {
// 	return vscode.languages.registerHoverProvider("*", {
// 		provideHover: async (
// 		  document: vscode.TextDocument,
// 		  position: vscode.Position
// 		) => {
// 		  if (!store.activeEditorSteps) {
// 			return;
// 		  }
// 		  const tourSteps = store.activeEditorSteps.filter(
// 			([, , , line]) => line === position.line
// 		  );
// 		  const hovers = tourSteps.map(([]) => {
// 			const args = encodeURIComponent(JSON.stringify([tour.id, stepNumber]));
// 			const command = `command:codetour._startTourById?${args}`;
// 			return `CodeTour: ${tour.title} (Step #${
// 			  stepNumber + 1
// 			}) &nbsp;[Start Tour](${command} "Start Tour")\n`;
// 		  });
// 		  const content = new vscode.MarkdownString(hovers.join("\n"));
// 		  content.isTrusted = true;
// 		  return new vscode.Hover(content);
// 		}
// 	  });
// 	}
// }
function getSelection() {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor &&
        activeEditor.selection &&
        !activeEditor.selection.isEmpty) {
        const { start, end } = activeEditor.selection;
        // Convert the selection from 0-based
        // to 1-based to make it easier to
        // edit the JSON tour file by hand.
        const selection = {
            start: {
                line: start.line + 1,
                character: start.character + 1
            },
            end: {
                line: end.line + 1,
                character: end.character + 1
            }
        };
        console.log('selection', selection);
    }
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const DECORATOR = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse('./constants/Adamite.png'),
        gutterIconSize: "contain",
        overviewRulerColor: "rgb(246,232,154)",
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });
    console.log('Congratulations, your extension "adamite" is now active!');
    const panel = vscode.window.createWebviewPanel('annotating', // Identifies the type of the webview. Used internally
    'ADAMITE', // Title of the panel displayed to the user
    vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
    {} // Webview options. More on these later.
    );
    context.subscriptions.push(vscode.commands.registerCommand('adamite.annotate', () => {
        // Create and show a new webview
        panel.webview.html = getWebviewContent();
    }));
    let disposable = vscode.commands.registerCommand('adamite.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Adamite!');
    });
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
        const { start, end } = activeTextEditor.selection;
        const r = [new vscode.Range(start, end)];
        activeTextEditor.setDecorations(DECORATOR, r);
        console.log('did something', DECORATOR);
        // console.log(text);
        // getSelection();
        // panel.webview.postMessage({
        // 	type: "selected",
        // 	value: text,
        // });
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function getWebviewContent() {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
	  <h1>Welcome to the annotation tab, where you can select code and you will see it appear here.</h1>
	  <h2 id = "select">sfkjvdkjfbv</h2>
  </body>

  <script>
  	window.addEventListener('message', event => {
		const message = event.data; // The JSON data our extension sent
		console.log({message})
		switch (message.type) {
			case 'selected':
				document.getElementById('select').innerHTML = message.value;
	}
  </script>
  </html>`;
}
// // this method is called when your extension is deactivated
// export function deactivate() {}

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map