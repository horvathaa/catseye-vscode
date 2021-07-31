// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TextEncoder } from 'util';
var uniqid = require('uniqid');
import ViewLoader from './view/ViewLoader';
// need to add ID and timestamp so we can keep track of the annotations (i.e. don't create duplicates in the concat operation)
// also clean up old annotations that don't exist because their range is no longer valid

// add anchor text as property - set using activeEditor.document.getText(activeEditor.selection) then in paste event check if there's something
// in copy keyboard and if theres a match between the pasted text and the anchor text I think??
var shiki = require('shiki');
export default class Annotation {
	id: string;
	filename: string | vscode.Uri;
	anchorText: string;
	annotation: string;
	startLine: number;
	endLine: number;
	startOffset: number;
	endOffset: number;
	toDelete: boolean;
	
	constructor(id: string, filename: string | vscode.Uri, anchorText: string, annotation: string, anchorStartLine: number, anchorEndLine: number, anchorStartOffset: number, anchorEndOffset: number, toDelete: boolean) {
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


const handleSaveCloseEvent = (annotationList: Annotation[], filePath: string, currentFile: string) => {
	const annotationsInCurrentFile = annotationList.filter(a => a.filename === currentFile);
	if(annotationsInCurrentFile.length && vscode.workspace.workspaceFolders !== undefined) {
		writeAnnotationsToFile(annotationList, filePath);
	}
}

const writeAnnotationsToFile = async (annotationList: Annotation[], filePath: string) => {
	const serializedObjects = annotationList.map(a => { return {
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
	}})

	if(vscode.workspace.workspaceFolders !== undefined)  {
		const uri = vscode.Uri.file(filePath);
		try {
			await vscode.workspace.fs.stat(uri);
			vscode.workspace.openTextDocument(filePath).then(doc => { 
				vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
					annotationList.forEach(a => a.toDelete = false);
				})
			})
		}
		catch {
			// console.log('file does not exist');
			const wsEdit = new vscode.WorkspaceEdit();
			wsEdit.createFile(uri)
			vscode.workspace.applyEdit(wsEdit).then((value: boolean) => {
				if(value) { // edit applied??
					vscode.workspace.openTextDocument(filePath).then(doc => { 
						vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
							annotationList.forEach(a => a.toDelete = false);
						})
					})
				}
				else {
					vscode.window.showInformationMessage('Could not create file!');
				}
			});
			
		}
		
	}
}

const getAnchorsInRange = (selection: vscode.Selection, annotationList: Annotation[]) => {
	return annotationList.map(a =>{ return { id: a.id, range: createRangeFromAnnotation(a) } }).filter(a => selection.contains(a.range));
}

// computes boundary points of each annotation's range given the pasted new range
const splitRange = (range: vscode.Range, annotationList: Annotation[], filename: string, changeText: string) => {
	let annoRanges = annotationList.map(a =>{ return {id: a.id, range: createRangeFromAnnotation(a), anchorText: a.anchorText }});
	// ensure first range in list is the beginning boundary range
	annoRanges = annoRanges.sort((a, b) => {
		return a.range.start.line - b.range.start.line;
	});

	annoRanges = annoRanges.map((a: any, index: number) => {
		console.log('a', a)
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
		if(index === 0) {
			let newRange = { id: a.id, range: new vscode.Range(new vscode.Position(range.start.line + numLinesBeforeAnchorStart, range.start.character), new vscode.Position(range.start.line + numLines + numLinesBeforeAnchorStart, endOffset)), anchorText: a.anchorText};
			return newRange;
		}
		// last range
		else if(index === annoRanges.length - 1) {
			return {id: a.id, range: new vscode.Range(new vscode.Position(range.end.line - numLines,  startOffset), range.end), anchorText: a.anchorText};
		}
		// middle ranges
		else {
			return {id: a.id, range: new vscode.Range(
				new vscode.Position(lastRange?.end.line, lastRange?.end.character + startOffset), 
				new vscode.Position(lastRange?.end.line + numLines, endOffset)),
			anchorText: a.anchorText} 
			
		}
	});

	const rangeAdjustedAnnotations = annotationList.map(a => {
		const index = annoRanges.findIndex(r => r.id === a.id);
		const annoRange = annoRanges[index].range;
		return new Annotation(uniqid(), filename, a.anchorText, a.annotation, annoRange.start.line, annoRange.end.line, annoRange.start.character, annoRange.end.character, false);
	});
	return rangeAdjustedAnnotations;

}

const translateChanges = (originalStartLine: number, originalEndLine: number, originalStartOffset: number, 
	originalEndOffset: number, startLine: number, endLine: number, startOffset: number, 
	endOffset: number, textLength: number, diff: number, rangeLength: number, 
	anchorText: string, annotation: string, filename: string, id: string, text: string): any => {
		let newRange = { startLine: originalStartLine, endLine: originalEndLine, startOffset: originalStartOffset, endOffset: originalEndOffset };
		const startAndEndLineAreSame = originalStartLine === startLine && originalEndLine === endLine && !diff;
		const originalRange = new vscode.Range(new vscode.Position(originalStartLine, originalStartOffset), new vscode.Position(originalEndLine, originalEndOffset));
		const changeRange = new vscode.Range(new vscode.Position(startLine, startOffset), new vscode.Position(endLine, endOffset)); 
		// user deleted the anchor
		if(!textLength && changeRange.contains(originalRange)) {
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
			if(startAndEndLineAreSame) {
				newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
			}
		}
		// user made change before or at our end offset
		if(originalEndLine === endLine && endOffset <= originalEndOffset && !diff) {
			newRange.endOffset = textLength ? originalEndOffset + textLength : originalEndOffset - rangeLength;
		}
		// user inserted text at our end offset ()
		if(originalEndLine === endLine && endOffset === (originalEndOffset + textLength) && !diff) {
			newRange.endOffset += textLength;
		}
		// user added lines between start and end (? not sure why we have this and the second condition)
		if(originalStartLine < startLine && endLine < originalEndLine && diff) {
			newRange.endLine = originalEndLine + diff;
		}

		return new Annotation(id, filename, anchorText, annotation, newRange.startLine, newRange.endLine, newRange.startOffset, newRange.endOffset, false);
	}

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

function createRangeFromAnnotation(annotation: Annotation) {
	return new vscode.Range(new vscode.Position(annotation.startLine, annotation.startOffset), new vscode.Position(annotation.endLine, annotation.endOffset))
}


export const convertFromJSONtoAnnotationList = (json: string) => {
	let annotationList: Annotation[] = [];
	JSON.parse(json).forEach((doc: any) => {
		annotationList.push(new Annotation(doc.id, doc.filename, doc.anchorText, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset, false))
	})
	return annotationList;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// let highLighted: vscode.Range[] = [];
	
	let annotationList: Annotation[] = [];
	let copiedAnnotations: Annotation[] = [];
	let view: ViewLoader | undefined = undefined;
	let tempAnno: Annotation | null = null;

	const overriddenClipboardCopyAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
		const annotationsInEditor = annotationList.filter((a: Annotation) => a.filename === textEditor.document.uri.toString());
		const annosInRange = getAnchorsInRange(textEditor.selection, annotationsInEditor);
		if(annosInRange.length) {
			const annoIds = annosInRange.map(a => a.id)
			copiedAnnotations = annotationList.filter(a => annoIds.includes(a.id));
		}
		vscode.env.clipboard.writeText(textEditor.document.getText(textEditor.selection));
	
	}

	const clipboardDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', overriddenClipboardCopyAction);

	let disposableEventListener = vscode.window.onDidChangeVisibleTextEditors( async (textEditors) => {
		const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
		if(vscode.workspace.workspaceFolders !== undefined) writeAnnotationsToFile(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json');
		
		const annotationsToHighlight = annotationList.filter(a => textEditorFileNames.includes(a.filename.toString()))
		if(!annotationsToHighlight.length) { return };
		let ranges = annotationsToHighlight.map(a => { return {filename: a.filename, range: createRangeFromAnnotation(a)}});
		textEditors.forEach(t => {
			let annos = ranges.filter(r => r.filename === t.document.uri.toString()).map(a => a.range)
			t.setDecorations(annotationDecorations, annos)
		} );
	});

	

	vscode.workspace.onDidSaveTextDocument((TextDocument: vscode.TextDocument) => {
		if(vscode.workspace.workspaceFolders) handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString());
	});

	vscode.workspace.onDidCloseTextDocument((TextDocument: vscode.TextDocument) => {
		if(vscode.workspace.workspaceFolders) handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString());
	});

	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		const currentAnnotations = annotationList.filter(a => a.filename === e.document.uri.toString());
		if(!currentAnnotations.length && !tempAnno) { return } // no annotations are affected by this change
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
				let rangeAdjustedAnnotations: Annotation[] = [];
				let didPaste: boolean = false;
				if(copiedAnnotations.length) {
					const copiedAnnotationTextArr = copiedAnnotations.map(a => a.anchorText.replace(/\s+/g, ''));
					const cleanChangeText = change.text.replace(/\s+/g, '');
					const doesContain = copiedAnnotationTextArr.map(t => cleanChangeText.includes(t));
					// can be improved by using filter and only computing new anchors for annotations that
					// are included in the pasted text - can maybe get the offset earlier too???
					if(doesContain.includes(true)) {
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
				
				const translatedAnnotations = currentAnnotations.map(a => translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, 
					change.text.length, diff, change.rangeLength, a.anchorText, a.annotation, a.filename.toString(), a.id, change.text)).filter(a => !a.toDelete);
				// if the user is on the process of creating an annotation, update that annotation as well
				tempAnno = tempAnno ? translateChanges(tempAnno.startLine, tempAnno.endLine, tempAnno.startOffset, tempAnno.endOffset, startLine, endLine, startOffset, endOffset, 
					change.text.length, diff, change.rangeLength, tempAnno.anchorText, tempAnno.annotation, tempAnno.filename.toString(), tempAnno.id, change.text) : null;
				annotationList = translatedAnnotations.concat(annotationList.filter(a => a.filename !== e.document.uri.toString()), rangeAdjustedAnnotations);
				if(didPaste && vscode.window.activeTextEditor) {
					const ranges = annotationList.map(a => createRangeFromAnnotation(a));
					vscode.window.activeTextEditor?.setDecorations(annotationDecorations, ranges);
				}
				view?.updateDisplay(annotationList);
			}
		}
		
	})
	
	// console.log('Congratulations, your extension "adamite" is now active!');
	// let code: string[] = [];
	// consider changing selection command name to "Annotate" (e.g., move sel code here) as this is
	// a more accurate name
	context.subscriptions.push(vscode.commands.registerCommand('adamite.annotate', () => {
		// Create and show a new webview
		
	  })
	);

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
		// vscode.window.showInformationMessage('Hello World from Adamite!');
		let filePath = "";
		if(vscode.workspace.workspaceFolders !== undefined) {
			filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.json';
			const uri = vscode.Uri.file(filePath);
			try {
				vscode.workspace.fs.stat(uri);
				vscode.workspace.openTextDocument(filePath).then(doc => { 
					let docText = JSON.parse(doc.getText())
					docText.forEach((doc: any) => {
						annotationList.push(new Annotation(doc.id, doc.filename, doc.anchorText, doc.annotation, doc.anchor.startLine, doc.anchor.endLine, doc.anchor.startOffset, doc.anchor.endOffset, false))
					})
					const filenames = [... new Set(annotationList.map(a => a.filename))]
					if(annotationList.length && activeEditor !== undefined && filenames.includes(activeEditor?.document.uri.toString())) {
						let ranges = annotationList.map(a => { return {filename: a.filename, range: createRangeFromAnnotation(a)}}).filter(r => r.filename === activeEditor?.document.uri.toString()).map(a => a.range);
						if(ranges.length) {
							activeEditor.setDecorations(annotationDecorations, ranges);
						} 
					}
				})
			}
			// file does not exist - user either deleted it or this is their first time making an annotation
			catch {
				// console.log('file does not exist');
				const wsEdit = new vscode.WorkspaceEdit();
				wsEdit.createFile(uri)
				vscode.workspace.applyEdit(wsEdit);
			}

		}


		// VIEW LISTENERS //
		if(vscode.workspace.workspaceFolders) {
			view = new ViewLoader(vscode.workspace.workspaceFolders[0].uri, context.extensionPath);
			if(view) {
				 view._panel?.webview.onDidReceiveMessage((message) => {
					 switch(message.command) {
						 // get anno and scroll to it in the editor
						 case 'scrollInEditor': {
							 const anno = annotationList.filter(anno => anno.id === message.id)[0];
							 if(anno) {
								 const range = createRangeFromAnnotation(anno);
								 const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === anno.filename)[0];
								 text.revealRange(range, 1);
							 }
							 break;
						 }
						 case 'createAnnotation': {
							 // finalize annotation creation
							 if(tempAnno) {
								tempAnno.annotation = message.anno;
								annotationList.push(tempAnno);
								const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === tempAnno?.filename)[0];
								tempAnno = null;
								view?.updateDisplay(annotationList);
								const filenames = [... new Set(annotationList.map(a => a.filename))];
								// shiki.getHighlighter({theme: 'nord'}).then((highlighter: any) => {
								// 	const html = highlighter.codeToHtml(annotationList[0].anchorText, annotationList[0].filename.toString().match(/\.[0-9a-z]+$/i))[0].replace(".", "")
								// 	console.log('html', html);
								// 	if(html) return html;
								// })
								// add highlight for new anno
								if(annotationList.length && text !== undefined && filenames.includes(text.document.uri.toString())) {
									let ranges = annotationList
										.map(a => { return {annotation: a.annotation, filename: a.filename, range: createRangeFromAnnotation(a)}})
										.filter(r => r.filename === text?.document.uri.toString())
										.map(a => a.range);
									if(ranges.length) {
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
							view?.updateDisplay(annotationList);
							break;
						}
						default: {
							break;
						}
							
					}
				 })
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
		tempAnno = new Annotation(uniqid(), activeTextEditor.document.uri.toString(), text, 'test',  r.start.line, r.end.line, r.start.character, r.end.character, false);
		view?.createNewAnno(text, annotationList);	
	}));

	context.subscriptions.push(disposable);
	context.subscriptions.push(clipboardDisposable);
	context.subscriptions.push(disposableEventListener);
}

// // this method is called when your extension is deactivated
export function deactivate() {}
