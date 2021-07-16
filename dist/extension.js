/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __webpack_require__(1);
const util_1 = __webpack_require__(2);
var uniqid = __webpack_require__(3);
// need to add ID and timestamp so we can keep track of the annotations (i.e. don't create duplicates in the concat operation)
// also clean up old annotations that don't exist because their range is no longer valid
// add anchor text as property - set using activeEditor.document.getText(activeEditor.selection) then in paste event check if there's something
// in copy keyboard and if theres a match between the pasted text and the anchor text I think??
class Annotation {
    constructor(id, filename, anchorText, annotation, anchorStartLine, anchorEndLine, anchorStartOffset, anchorEndOffset, toDelete) {
        this.id = id;
        this.filename = filename;
        this.anchorText = anchorText;
        this.annotation = annotation;
        this.startLine = anchorStartLine;
        this.endLine = anchorEndLine;
        this.startOffset = anchorStartOffset;
        this.endOffset = anchorEndOffset;
        this.toDelete = toDelete;
    }
}
const getAnchorsInRange = (selection, annotationList) => {
    return annotationList.map(a => { return { id: a.id, range: createRangeFromAnnotation(a) }; }).filter(a => selection.contains(a.range));
};
// computes boundary points of each annotation's range given the pasted new range
const splitRange = (range, annotationList, filename) => {
    console.log('in here');
    let annoRanges = annotationList.map(a => { return { id: a.id, range: createRangeFromAnnotation(a) }; });
    // ensure first range in list is the beginning boundary range
    console.log('annoRanges', annoRanges);
    annoRanges = annoRanges.sort((a, b) => {
        return a.range.start.line - b.range.start.line;
    });
    console.log('annoRanges after sort', annoRanges);
    annoRanges = annoRanges.map((a, index) => {
        console.log('a', a);
        let r = a.range;
        let numLines = r.end.line - r.start.line;
        let startOffset = r.start.character;
        let endOffset = r.end.character;
        const lastRange = index > 0 ? annoRanges[index - 1].range : r;
        console.log('index', index);
        // first range
        if (index === 0) {
            let newRange = { id: a.id, range: new vscode.Range(range.start, new vscode.Position(range.start.line + numLines, endOffset)) };
            console.log('in here', newRange);
            return newRange;
        }
        // last range
        else if (index === annoRanges.length - 1) {
            return { id: a.id, range: new vscode.Range(new vscode.Position(range.end.line - numLines, startOffset), range.end) };
        }
        // middle ranges
        else {
            return { id: a.id, range: new vscode.Range(new vscode.Position(lastRange === null || lastRange === void 0 ? void 0 : lastRange.end.line, (lastRange === null || lastRange === void 0 ? void 0 : lastRange.end.character) + startOffset), new vscode.Position((lastRange === null || lastRange === void 0 ? void 0 : lastRange.end.line) + numLines, endOffset)) };
        }
    });
    console.log('annoRanges after map', annoRanges);
    const rangeAdjustedAnnotations = annotationList.map(a => {
        const index = annoRanges.findIndex(r => r.id === a.id);
        const annoRange = annoRanges[index].range;
        return new Annotation(uniqid(), filename, a.anchorText, a.annotation, annoRange.start.line, annoRange.end.line, annoRange.start.character, annoRange.end.character, false);
    });
    console.log('rangeadjusteed', rangeAdjustedAnnotations);
    return rangeAdjustedAnnotations;
};
const translateChanges = (originalStartLine, originalEndLine, originalStartOffset, originalEndOffset, startLine, endLine, startOffset, endOffset, textLength, diff, rangeLength, anchorText, annotation, filename, id, text) => {
    let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };
    const startAndEndLineAreSame = originalStartLine === startLine && originalEndLine === endLine && !diff;
    const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
    const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset));
    // user deleted the anchor
    if (!textLength && changeRange.contains(originalRange)) {
        return new Annotation(uniqid(), filename, anchorText, annotation, newRange.startLine, newRange.endLine, newRange.startOffset, newRange.endOffset, true);
    }
    // user added lines above start of range
    if (originalStartLine > startLine && diff) {
        newRange.startLine = originalStartLine + diff;
        newRange.endLine = originalEndLine + diff;
    }
    // user added line after start and before end
    if (originalStartLine === startLine && originalStartOffset <= startOffset && diff) {
        newRange.endLine = originalEndLine + diff;
    }
    // user added line before the end of the offset so we add a line
    if (originalEndLine === endLine && originalEndOffset >= endOffset && diff) {
        newRange.endLine = originalEndLine + diff;
    }
    // user made change before our start offset
    if (originalStartLine === startLine && startOffset < originalStartOffset) {
        newRange.startOffset = textLength ? originalStartOffset + textLength : originalStartOffset - rangeLength;
        // if end is on the same line we need to update it too
        if (startAndEndLineAreSame) {
            newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
        }
    }
    // user made change before or at our end offset
    if (originalEndLine === endLine && endOffset <= originalEndOffset && !diff) {
        newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
    }
    // user inserted text at our end offset ()
    if (originalEndLine === endLine && endOffset === (originalEndOffset + textLength) && !diff) {
        newRange.endOffset += textLength;
    }
    // user added lines between start and end (? not sure why we have this and the second condition)
    if (originalStartLine < startLine && endLine < originalEndLine && diff) {
        newRange.endLine = originalEndLine + diff;
    }
    return new Annotation(id, filename, anchorText, annotation, newRange.startLine, newRange.endLine, newRange.startOffset, newRange.endOffset, false);
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
function createRangeFromAnnotation(annotation) {
    return new vscode.Range(new vscode.Position(annotation.startLine, annotation.startOffset), new vscode.Position(annotation.endLine, annotation.endOffset));
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let highLighted = [];
    let annotationList = [];
    let copiedAnnotations = [];
    const overriddenClipboardPasteAction = (textEditor, edit, args) => {
    };
    const overriddenClipboardCopyAction = (textEditor, edit, args) => {
        console.log('copy', textEditor, edit);
        // let annotationList = args[0]; // ????
        const annotationsInEditor = annotationList.filter((a) => a.filename === textEditor.document.uri.toString());
        const annosInRange = getAnchorsInRange(textEditor.selection, annotationsInEditor);
        if (annosInRange.length) {
            const annoIds = annosInRange.map(a => a.id);
            copiedAnnotations = annotationList.filter(a => annoIds.includes(a.id));
            console.log('what is happening', copiedAnnotations, textEditor.document.getText(textEditor.selection));
            // write to clipboard annotation metadata? need to figure out how to structure data on clipboard
        }
        vscode.env.clipboard.writeText(textEditor.document.getText(textEditor.selection)).then(() => console.log('wrote'));
    };
    const clipboardDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', overriddenClipboardCopyAction);
    // const clipboardPasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', overriddenClipboardPasteAction);
    // const cutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', overriddenClipboardCopyAction);
    let disposableEventListener = vscode.window.onDidChangeVisibleTextEditors((textEditors) => __awaiter(this, void 0, void 0, function* () {
        const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
        const serializedObjects = annotationList.map(a => {
            return {
                id: a.id,
                filename: a.filename,
                anchorText: a.anchorText,
                annotation: a.annotation,
                anchor: {
                    startLine: a.startLine,
                    endLine: a.endLine,
                    startOffset: a.startOffset,
                    endOffset: a.endOffset
                }
            };
        });
        let filePath = "";
        if (vscode.workspace.workspaceFolders !== undefined) {
            filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.json';
            const uri = vscode.Uri.file(filePath);
            try {
                yield vscode.workspace.fs.stat(uri);
                vscode.workspace.openTextDocument(filePath).then(doc => {
                    vscode.workspace.fs.writeFile(doc.uri, new util_1.TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
                        annotationList.forEach(a => a.toDelete = false);
                    });
                });
            }
            catch (_a) {
                // console.log('file does not exist');
                const wsEdit = new vscode.WorkspaceEdit();
                wsEdit.createFile(uri);
                vscode.workspace.applyEdit(wsEdit).then((value) => {
                    if (value) { // edit applied??
                        vscode.workspace.openTextDocument(filePath).then(doc => {
                            vscode.workspace.fs.writeFile(doc.uri, new util_1.TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
                                annotationList.forEach(a => a.toDelete = false);
                            });
                        });
                    }
                    else {
                        vscode.window.showInformationMessage('Could not create file!');
                    }
                });
            }
        }
        const annotationsToHighlight = annotationList.filter(a => textEditorFileNames.includes(a.filename.toString()));
        if (!annotationsToHighlight.length) {
            return;
        }
        ;
        let ranges = annotationsToHighlight.map(a => { return { filename: a.filename, range: createRangeFromAnnotation(a) }; });
        textEditors.forEach(t => {
            let annos = ranges.filter(r => r.filename === t.document.uri.toString()).map(a => a.range);
            t.setDecorations(annotationDecorations, annos);
        });
        // }
    }));
    vscode.workspace.onDidChangeTextDocument((e) => {
        var _a;
        const currentAnnotations = annotationList.filter(a => a.filename === e.document.uri.toString());
        if (!currentAnnotations.length) {
            return;
        }
        else {
            for (const change of e.contentChanges) {
                const startLine = change.range.start.line;
                const endLine = change.range.end.line;
                const startOffset = change.range.start.character;
                const endOffset = change.range.end.character + change.text.length;
                const linesInRange = endLine - startLine;
                const linesInserted = change.text.split("\n").length - 1;
                const diff = linesInserted - linesInRange;
                console.log('e', e);
                // check to see if user pasted a copied annotation... 
                let rangeAdjustedAnnotations = [];
                let didPaste = false;
                if (copiedAnnotations.length) {
                    const copiedAnnotationText = copiedAnnotations.map(a => a.anchorText).join('').replace(/\s+/g, '');
                    console.log('in first if', copiedAnnotationText, 'change', change.text);
                    const cleanChangeText = change.text.replace(/\s+/g, '');
                    if (cleanChangeText.includes(copiedAnnotationText)) {
                        console.log('in second if');
                        const numLines = (change.text.match(/\n/g) || []).length;
                        const computedEndOffset = change.text.substr(change.text.lastIndexOf('\n') + 1).length;
                        const actuallyUsefulRange = new vscode.Range(startLine, startOffset, startLine + numLines, computedEndOffset);
                        console.log('what is happening');
                        rangeAdjustedAnnotations = copiedAnnotations.length > 1 ? splitRange(actuallyUsefulRange, copiedAnnotations, e.document.uri.toString()) :
                            [new Annotation(uniqid(), e.document.uri.toString(), change.text, 'test', startLine, actuallyUsefulRange.end.line, startOffset, actuallyUsefulRange.end.character, false)];
                        // annotationList = annotationList.concat(rangeAdjustedAnnotations);
                        console.log('updated Annotation List', rangeAdjustedAnnotations);
                        didPaste = true;
                        // copiedAnnotations = []; // we pasted?
                    }
                }
                const translatedAnnotations = currentAnnotations.map(a => translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, change.text.length, diff, change.rangeLength, a.anchorText, a.annotation, a.filename.toString(), a.id, change.text)).filter(a => !a.toDelete);
                annotationList = translatedAnnotations.concat(annotationList.filter(a => a.filename !== e.document.uri.toString()), rangeAdjustedAnnotations);
                if (didPaste && vscode.window.activeTextEditor) {
                    console.log('in here');
                    const ranges = annotationList.map(a => createRangeFromAnnotation(a));
                    console.log('ranges', ranges);
                    (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.setDecorations(annotationDecorations, ranges);
                }
            }
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
        },
    });
    let activeEditor = vscode.window.activeTextEditor; // amber: this value does not update if the user changes active editors so we shouldn't use it OR should update code to keep this value update
    let disposable = vscode.commands.registerCommand('adamite.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Adamite!');
        let filePath = "";
        if (vscode.workspace.workspaceFolders !== undefined) {
            filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.json';
            const uri = vscode.Uri.file(filePath);
            try {
                vscode.workspace.fs.stat(uri);
                vscode.workspace.openTextDocument(filePath).then(doc => {
                    let docText = JSON.parse(doc.getText());
                    docText.forEach((doc) => {
                        annotationList.push(new Annotation(doc.id, doc.filename, doc.anchorText, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset, false));
                    });
                    const filenames = [...new Set(annotationList.map(a => a.filename))];
                    if (annotationList.length && activeEditor !== undefined && filenames.includes(activeEditor === null || activeEditor === void 0 ? void 0 : activeEditor.document.uri.toString())) {
                        let ranges = annotationList.map(a => { return { filename: a.filename, range: createRangeFromAnnotation(a) }; }).filter(r => r.filename === (activeEditor === null || activeEditor === void 0 ? void 0 : activeEditor.document.uri.toString())).map(a => a.range);
                        if (ranges.length) {
                            activeEditor.setDecorations(annotationDecorations, ranges);
                        }
                    }
                });
            }
            // file does not exist - user either deleted it or this is their first time making an annotation
            catch (_a) {
                // console.log('file does not exist');
                const wsEdit = new vscode.WorkspaceEdit();
                wsEdit.createFile(uri);
                vscode.workspace.applyEdit(wsEdit);
            }
        }
        // })
    });
    context.subscriptions.push(vscode.commands.registerCommand('adamite.sel', () => {
        const { activeTextEditor } = vscode.window;
        if (!activeTextEditor) {
            vscode.window.showInformationMessage("No text editor is open!");
            return;
        }
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
        // highLighted.push(r); - aren't using highlighted anymore
        annotationList.push(new Annotation(uniqid(), activeTextEditor.document.uri.toString(), text, 'test', r.start.line, r.end.line, r.start.character, r.end.character, false));
        const filenames = [...new Set(annotationList.map(a => a.filename))];
        if (annotationList.length && vscode.window.activeTextEditor !== undefined && filenames.includes(vscode.window.activeTextEditor.document.uri.toString())) {
            let ranges = annotationList
                .map(a => { return { annotation: a.annotation, filename: a.filename, range: createRangeFromAnnotation(a) }; })
                .filter(r => { var _a; return r.filename === ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.toString()); })
                .map(a => a.range);
            if (ranges.length) {
                try {
                    vscode.window.activeTextEditor.setDecorations(annotationDecorations, ranges);
                }
                catch (error) {
                    console.log('couldnt highlight', error);
                }
            }
        }
    }));
    context.subscriptions.push(disposable);
    context.subscriptions.push(clipboardDisposable);
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


/***/ }),
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");;

/***/ }),
/* 2 */
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ }),
/* 3 */
/***/ ((module) => {

/* 
(The MIT License)
Copyright (c) 2014-2021 Halász Ádám <adam@aimform.com>
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//  Unique Hexatridecimal ID Generator
// ================================================

//  Dependencies
// ================================================
var pid = typeof process !== 'undefined' && process.pid ? process.pid.toString(36) : '' ;
var address = '';
if(false){ var i, mac, networkInterfaces; } 

//  Exports
// ================================================
module.exports = module.exports.default = function(prefix, suffix){ return (prefix ? prefix : '') + address + pid + now().toString(36) + (suffix ? suffix : ''); }
module.exports.process = function(prefix, suffix){ return (prefix ? prefix : '') + pid + now().toString(36) + (suffix ? suffix : ''); }
module.exports.time    = function(prefix, suffix){ return (prefix ? prefix : '') + now().toString(36) + (suffix ? suffix : ''); }

//  Helpers
// ================================================
function now(){
    var time = Date.now();
    var last = now.last || time;
    return now.last = time > last ? time : last + 1;
}


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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map