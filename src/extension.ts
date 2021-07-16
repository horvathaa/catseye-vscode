// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isDate, TextEncoder } from 'util';
var uniqid = require('uniqid');

// need to add ID and timestamp so we can keep track of the annotations (i.e. don't create duplicates in the concat operation)
// also clean up old annotations that don't exist because their range is no longer valid

// add anchor text as property - set using activeEditor.document.getText(activeEditor.selection) then in paste event check if there's something
// in copy keyboard and if theres a match between the pasted text and the anchor text I think??

class Annotation {
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

const getAnchorsInRange = (selection: vscode.Selection, annotationList: Annotation[]) => {
	return annotationList.map(a =>{ return { id: a.id, range: createRangeFromAnnotation(a) } }).filter(a => selection.contains(a.range));
}

// computes boundary points of each annotation's range given the pasted new range
const splitRange = (range: vscode.Range, annotationList: Annotation[]) => {
	let ranges = annotationList.map(a => createRangeFromAnnotation(a));
	// ensure first range in list is the beginning boundary range
	ranges = ranges.sort((a, b) => {
		return a.start.line - b.start.line;
	});

	ranges = ranges.map((r, index) => {
		let numLines = r.end.line - r.start.line;
		let startOffset = r.start.character;
		let endOffset = r.end.character;
		// first range
		if(index === 0) {
			return new vscode.Range(range.start, new vscode.Position(range.start.line + numLines, endOffset))
		}
		// last range
		else if(index === ranges.length - 1) {
			return new vscode.Range(new vscode.Position(range.end.line - numLines,  startOffset), range.end);
		}
		// middle ranges
		else {
			// return new vscode.Range() -- something hard here
		}
	})
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


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let highLighted: vscode.Range[] = [];
	
	let annotationList: Annotation[] = [];
	let copiedAnnotations: Annotation[] = [];

	const overriddenClipboardPasteAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {

	}

	const overriddenClipboardCopyAction = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
		console.log('copy', textEditor, edit);
		// let annotationList = args[0]; // ????
		const annotationsInEditor = annotationList.filter((a: Annotation) => a.filename === textEditor.document.uri.toString());
		const annosInRange = getAnchorsInRange(textEditor.selection, annotationsInEditor);
		if(annosInRange.length) {
			const annoIds = annosInRange.map(a => a.id)
			copiedAnnotations = annotationList.filter(a => annoIds.includes(a.id));
			// write to clipboard annotation metadata? need to figure out how to structure data on clipboard
		}
	
	}

	const clipboardDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', overriddenClipboardCopyAction);
	// const clipboardPasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', overriddenClipboardPasteAction);
	const cutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', overriddenClipboardCopyAction);

	


	let disposableEventListener = vscode.window.onDidChangeVisibleTextEditors( async (textEditors) => {
		const textEditorFileNames = textEditors.map(t => t.document.uri.toString())
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
		let filePath = "";
		if(vscode.workspace.workspaceFolders !== undefined)  {
			filePath = vscode.workspace.workspaceFolders[0].uri.path + '/test.json';
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

		const annotationsToHighlight = annotationList.filter(a => textEditorFileNames.includes(a.filename.toString()))
		if(!annotationsToHighlight.length) { return };
		let ranges = annotationsToHighlight.map(a => { return {filename: a.filename, range: createRangeFromAnnotation(a)}});
		textEditors.forEach(t => {
			let annos = ranges.filter(r => r.filename === t.document.uri.toString()).map(a => a.range)
			t.setDecorations(annotationDecorations, annos)
		} );
				
			
		// }
		
	});

	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		const currentAnnotations = annotationList.filter(a => a.filename === e.document.uri.toString());
		if(!currentAnnotations.length) { return }
		else {
			for (const change of e.contentChanges) {
				const startLine = change.range.start.line;
				const endLine = change.range.end.line;
				const startOffset = change.range.start.character;
				const endOffset = change.range.end.character + change.text.length;
				const linesInRange = endLine - startLine;
				const linesInserted = change.text.split("\n").length - 1;
				const diff = linesInserted - linesInRange;

				console.log('e', e)

				// check to see if user pasted a copied annotation... 
				if(copiedAnnotations.length) {
					const copiedAnnotationText = copiedAnnotations.map(a => a.anchorText);
					if(copiedAnnotationText.includes(change.text)) {
						let rangeAdjustedAnnotations: Annotation[] = [];
						// if(copiedAnnotations.length > 1) {
							rangeAdjustedAnnotations = copiedAnnotations.length > 1 ? splitRange(change.range, copiedAnnotations) : copiedAnnotations;
						// }
						// copiedAnnotations.forEach(a => {
						// 	annotationList.push(new Annotation(uniqid, a.filename, a.anchorText, a.annotation, ))
						// })
					}
				}
				
				const translatedAnnotations = currentAnnotations.map(a => translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, 
					change.text.length, diff, change.rangeLength, a.anchorText, a.annotation, a.filename.toString(), a.id, change.text)).filter(a => !a.toDelete);
				
				annotationList = translatedAnnotations.concat(annotationList.filter(a => a.filename !== e.document.uri.toString()))
			}
		}
		
	})
	
	console.log('Congratulations, your extension "adamite" is now active!');
	let code: string[] = [];
	let panel = vscode.window.createWebviewPanel(
		'annotating', // Identifies the type of the webview. Used internally
		'ADAMITE', // Title of the panel displayed to the user
		vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
		{
			enableScripts: true
		} // Webview options. More on these later.
	  );
	context.subscriptions.push(vscode.commands.registerCommand('adamite.annotate', () => {
		// Create and show a new webview
		panel.webview.html = getWebviewContent("Hello", code);
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
		
	});

	let activeEditor = vscode.window.activeTextEditor; // amber: this value does not update if the user changes active editors so we shouldn't use it OR should update code to keep this value update


	let disposable = vscode.commands.registerCommand('adamite.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Adamite!');
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
		for(var i = 0; i < code.length; i++)
		{ 
    		console.log(i + ": " + code[i]); 
		}

		const updateTab = () => {
			panel.webview.html = getWebviewContent(text, code);
		}
		updateTab();
		//var fl = activeTextEditor.document.lineAt(activeTextEditor.selection.active.line);
		//var el = activeTextEditor.document.lineAt(activeTextEditor.selection.active.line);
		var r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);
		// highLighted.push(r); - aren't using highlighted anymore

		annotationList.push(new Annotation(uniqid(), activeTextEditor.document.uri.toString(), text, 'test',  r.start.line, r.end.line, r.start.character, r.end.character, false))

		const filenames = [... new Set(annotationList.map(a => a.filename))]
		if(annotationList.length && vscode.window.activeTextEditor !== undefined && filenames.includes(vscode.window.activeTextEditor.document.uri.toString())) {
			let ranges = annotationList
				.map(a => { return {annotation: a.annotation, filename: a.filename, range: createRangeFromAnnotation(a)}})
				.filter(r => r.filename === vscode.window.activeTextEditor?.document.uri.toString())
				.map(a => a.range);
			if(ranges.length) {
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



function getWebviewContent(sel: string, c:string[]) {
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
