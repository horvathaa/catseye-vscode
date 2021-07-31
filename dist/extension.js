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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.convertFromJSONtoAnnotationList = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const util_1 = require("util");
var uniqid = require('uniqid');
const ViewLoader_1 = require("./view/ViewLoader");
// need to add ID and timestamp so we can keep track of the annotations (i.e. don't create duplicates in the concat operation)
// also clean up old annotations that don't exist because their range is no longer valid
// add anchor text as property - set using activeEditor.document.getText(activeEditor.selection) then in paste event check if there's something
// in copy keyboard and if theres a match between the pasted text and the anchor text I think??
var shiki = require('shiki');
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
exports.default = Annotation;
const handleSaveCloseEvent = (annotationList, filePath, currentFile) => {
    const annotationsInCurrentFile = annotationList.filter(a => a.filename === currentFile);
    if (annotationsInCurrentFile.length && vscode.workspace.workspaceFolders !== undefined) {
        writeAnnotationsToFile(annotationList, filePath);
    }
};
const writeAnnotationsToFile = (annotationList, filePath) => __awaiter(void 0, void 0, void 0, function* () {
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
    if (vscode.workspace.workspaceFolders !== undefined) {
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
});
const getAnchorsInRange = (selection, annotationList) => {
    return annotationList.map(a => { return { id: a.id, range: createRangeFromAnnotation(a) }; }).filter(a => selection.contains(a.range));
};
// computes boundary points of each annotation's range given the pasted new range
const splitRange = (range, annotationList, filename, changeText) => {
    let annoRanges = annotationList.map(a => { return { id: a.id, range: createRangeFromAnnotation(a), anchorText: a.anchorText }; });
    // ensure first range in list is the beginning boundary range
    annoRanges = annoRanges.sort((a, b) => {
        return a.range.start.line - b.range.start.line;
    });
    annoRanges = annoRanges.map((a, index) => {
        console.log('a', a);
        let r = a.range;
        let numLines = r.end.line - r.start.line;
        let startOffset = r.start.character;
        let endOffset = r.end.character;
        const lastRange = index > 0 ? annoRanges[index - 1].range : r;
        const cleanAnchorText = a.anchorText.split(' ').join('');
        const cleanChangeText = changeText.split(' ').join('');
        const stringUntilAnchorText = cleanChangeText.substring(0, cleanChangeText.indexOf(cleanAnchorText));
        const numLinesBeforeAnchorStart = (stringUntilAnchorText.match(/\n/g) || []).length;
        // first range
        if (index === 0) {
            let newRange = { id: a.id, range: new vscode.Range(new vscode.Position(range.start.line + numLinesBeforeAnchorStart, range.start.character), new vscode.Position(range.start.line + numLines + numLinesBeforeAnchorStart, endOffset)), anchorText: a.anchorText };
            return newRange;
        }
        // last range
        else if (index === annoRanges.length - 1) {
            return { id: a.id, range: new vscode.Range(new vscode.Position(range.end.line - numLines, startOffset), range.end), anchorText: a.anchorText };
        }
        // middle ranges
        else {
            return { id: a.id, range: new vscode.Range(new vscode.Position(lastRange === null || lastRange === void 0 ? void 0 : lastRange.end.line, (lastRange === null || lastRange === void 0 ? void 0 : lastRange.end.character) + startOffset), new vscode.Position((lastRange === null || lastRange === void 0 ? void 0 : lastRange.end.line) + numLines, endOffset)),
                anchorText: a.anchorText };
        }
    });
    const rangeAdjustedAnnotations = annotationList.map(a => {
        const index = annoRanges.findIndex(r => r.id === a.id);
        const annoRange = annoRanges[index].range;
        return new Annotation(uniqid(), filename, a.anchorText, a.annotation, annoRange.start.line, annoRange.end.line, annoRange.start.character, annoRange.end.character, false);
    });
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
const convertFromJSONtoAnnotationList = (json) => {
    let annotationList = [];
    JSON.parse(json).forEach((doc) => {
        annotationList.push(new Annotation(doc.id, doc.filename, doc.anchorText, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset, false));
    });
    return annotationList;
};
exports.convertFromJSONtoAnnotationList = convertFromJSONtoAnnotationList;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // let highLighted: vscode.Range[] = [];
    let annotationList = [];
    let copiedAnnotations = [];
    let view = undefined;
    let tempAnno = null;
    const overriddenClipboardCopyAction = (textEditor, edit, args) => {
        const annotationsInEditor = annotationList.filter((a) => a.filename === textEditor.document.uri.toString());
        const annosInRange = getAnchorsInRange(textEditor.selection, annotationsInEditor);
        if (annosInRange.length) {
            const annoIds = annosInRange.map(a => a.id);
            copiedAnnotations = annotationList.filter(a => annoIds.includes(a.id));
        }
        vscode.env.clipboard.writeText(textEditor.document.getText(textEditor.selection));
    };
    const clipboardDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', overriddenClipboardCopyAction);
    let disposableEventListener = vscode.window.onDidChangeVisibleTextEditors((textEditors) => __awaiter(this, void 0, void 0, function* () {
        const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
        if (vscode.workspace.workspaceFolders !== undefined)
            writeAnnotationsToFile(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json');
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
    }));
    vscode.workspace.onDidSaveTextDocument((TextDocument) => {
        if (vscode.workspace.workspaceFolders)
            handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString());
    });
    vscode.workspace.onDidCloseTextDocument((TextDocument) => {
        if (vscode.workspace.workspaceFolders)
            handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString());
    });
    vscode.workspace.onDidChangeTextDocument((e) => {
        var _a;
        const currentAnnotations = annotationList.filter(a => a.filename === e.document.uri.toString());
        if (!currentAnnotations.length && !tempAnno) {
            return;
        } // no annotations are affected by this change
        else {
            for (const change of e.contentChanges) {
                const startLine = change.range.start.line;
                const endLine = change.range.end.line;
                const startOffset = change.range.start.character;
                const endOffset = change.range.end.character + change.text.length;
                const linesInRange = endLine - startLine;
                const linesInserted = change.text.split("\n").length - 1;
                const diff = linesInserted - linesInRange;
                // check to see if user pasted a copied annotation... 
                let rangeAdjustedAnnotations = [];
                let didPaste = false;
                if (copiedAnnotations.length) {
                    const copiedAnnotationTextArr = copiedAnnotations.map(a => a.anchorText.replace(/\s+/g, ''));
                    const cleanChangeText = change.text.replace(/\s+/g, '');
                    const doesContain = copiedAnnotationTextArr.map(t => cleanChangeText.includes(t));
                    // can be improved by using filter and only computing new anchors for annotations that
                    // are included in the pasted text - can maybe get the offset earlier too???
                    if (doesContain.includes(true)) {
                        const numLines = (change.text.match(/\n/g) || []).length;
                        const computedEndOffset = change.text.substr(change.text.lastIndexOf('\n') + 1).length;
                        const actuallyUsefulRange = new vscode.Range(startLine, startOffset, startLine + numLines, computedEndOffset);
                        rangeAdjustedAnnotations = copiedAnnotations.length > 1 ? splitRange(actuallyUsefulRange, copiedAnnotations, e.document.uri.toString(), change.text) :
                            [new Annotation(uniqid(), e.document.uri.toString(), change.text, 'test', startLine, actuallyUsefulRange.end.line, startOffset, actuallyUsefulRange.end.character, false)];
                        // annotationList = annotationList.concat(rangeAdjustedAnnotations);
                        didPaste = true;
                        // copiedAnnotations = []; // we pasted?
                    }
                }
                const translatedAnnotations = currentAnnotations.map(a => translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, change.text.length, diff, change.rangeLength, a.anchorText, a.annotation, a.filename.toString(), a.id, change.text)).filter(a => !a.toDelete);
                // if the user is on the process of creating an annotation, update that annotation as well
                tempAnno = tempAnno ? translateChanges(tempAnno.startLine, tempAnno.endLine, tempAnno.startOffset, tempAnno.endOffset, startLine, endLine, startOffset, endOffset, change.text.length, diff, change.rangeLength, tempAnno.anchorText, tempAnno.annotation, tempAnno.filename.toString(), tempAnno.id, change.text) : null;
                annotationList = translatedAnnotations.concat(annotationList.filter(a => a.filename !== e.document.uri.toString()), rangeAdjustedAnnotations);
                if (didPaste && vscode.window.activeTextEditor) {
                    const ranges = annotationList.map(a => createRangeFromAnnotation(a));
                    (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.setDecorations(annotationDecorations, ranges);
                }
                view === null || view === void 0 ? void 0 : view.updateDisplay(annotationList);
            }
        }
    });
    // console.log('Congratulations, your extension "adamite" is now active!');
    // let code: string[] = [];
    // consider changing selection command name to "Annotate" (e.g., move sel code here) as this is
    // a more accurate name
    context.subscriptions.push(vscode.commands.registerCommand('adamite.annotate', () => {
        // Create and show a new webview
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
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });
    let activeEditor = vscode.window.activeTextEditor; // amber: this value does not update if the user changes active editors so we shouldn't use it OR should update code to keep this value update
    let disposable = vscode.commands.registerCommand('adamite.helloWorld', () => {
        var _a;
        // vscode.window.showInformationMessage('Hello World from Adamite!');
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
            catch (_b) {
                // console.log('file does not exist');
                const wsEdit = new vscode.WorkspaceEdit();
                wsEdit.createFile(uri);
                vscode.workspace.applyEdit(wsEdit);
            }
        }
        // VIEW LISTENERS //
        if (vscode.workspace.workspaceFolders) {
            view = new ViewLoader_1.default(vscode.workspace.workspaceFolders[0].uri, context.extensionPath);
            if (view) {
                (_a = view._panel) === null || _a === void 0 ? void 0 : _a.webview.onDidReceiveMessage((message) => {
                    var _a, _b;
                    switch (message.command) {
                        // get anno and scroll to it in the editor
                        case 'scrollInEditor': {
                            const anno = annotationList.filter(anno => anno.id === message.id)[0];
                            if (anno) {
                                const range = createRangeFromAnnotation(anno);
                                const text = (_a = vscode.window.visibleTextEditors) === null || _a === void 0 ? void 0 : _a.filter(doc => doc.document.uri.toString() === anno.filename)[0];
                                text.revealRange(range, 1);
                            }
                            break;
                        }
                        case 'createAnnotation': {
                            // finalize annotation creation
                            if (tempAnno) {
                                tempAnno.annotation = message.anno;
                                annotationList.push(tempAnno);
                                const text = (_b = vscode.window.visibleTextEditors) === null || _b === void 0 ? void 0 : _b.filter(doc => doc.document.uri.toString() === (tempAnno === null || tempAnno === void 0 ? void 0 : tempAnno.filename))[0];
                                tempAnno = null;
                                view === null || view === void 0 ? void 0 : view.updateDisplay(annotationList);
                                const filenames = [...new Set(annotationList.map(a => a.filename))];
                                // shiki.getHighlighter({theme: 'nord'}).then((highlighter: any) => {
                                // 	const html = highlighter.codeToHtml(annotationList[0].anchorText, annotationList[0].filename.toString().match(/\.[0-9a-z]+$/i))[0].replace(".", "")
                                // 	console.log('html', html);
                                // 	if(html) return html;
                                // })
                                // add highlight for new anno
                                if (annotationList.length && text !== undefined && filenames.includes(text.document.uri.toString())) {
                                    let ranges = annotationList
                                        .map(a => { return { annotation: a.annotation, filename: a.filename, range: createRangeFromAnnotation(a) }; })
                                        .filter(r => r.filename === (text === null || text === void 0 ? void 0 : text.document.uri.toString()))
                                        .map(a => a.range);
                                    if (ranges.length) {
                                        try {
                                            text.setDecorations(annotationDecorations, ranges);
                                        }
                                        catch (error) {
                                            console.log('couldnt highlight', error);
                                        }
                                    }
                                }
                            }
                            break;
                        }
                        case 'cancelAnnotation': {
                            // reset temp object and re-render
                            tempAnno = null;
                            view === null || view === void 0 ? void 0 : view.updateDisplay(annotationList);
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                });
            }
        }
    });
    context.subscriptions.push(vscode.commands.registerCommand('adamite.sel', () => {
        const { activeTextEditor } = vscode.window;
        if (!activeTextEditor) {
            vscode.window.showInformationMessage("No text editor is open!");
            return;
        }
        const text = activeTextEditor.document.getText(activeTextEditor.selection);
        const r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
        tempAnno = new Annotation(uniqid(), activeTextEditor.document.uri.toString(), text, 'test', r.start.line, r.end.line, r.start.character, r.end.character, false);
        view === null || view === void 0 ? void 0 : view.createNewAnno(text, annotationList);
    }));
    context.subscriptions.push(disposable);
    context.subscriptions.push(clipboardDisposable);
    context.subscriptions.push(disposableEventListener);
}
exports.activate = activate;
// // this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map