import * as vscode from 'vscode';
import { annotationList, copiedAnnotations, tempAnno, setTempAnno, user, view, setActiveEditor, setAnnotationList } from '../extension';
import * as anchor from '../anchorFunctions/anchor';
import * as utils from '../utils/utils';
import Annotation from '../constants/constants';
import { v4 as uuidv4 } from 'uuid';
import { addHighlightsToEditor } from '../commands/commands';

export const handleChangeVisibleTextEditors = async (textEditors: vscode.TextEditor[]) => {
    const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
    // nneed to decide if we want to write to DB that often... if(vscode.workspace.workspaceFolders !== undefined) utils.saveAnnotations(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json');
    
    const annotationsToHighlight = annotationList.filter(a => textEditorFileNames.includes(a.filename.toString()))
    if(!annotationsToHighlight.length) return;
    // let ranges = annotationsToHighlight.map(a => { return {filename: a.filename, range: anchor.createRangeFromAnnotation(a), annotation: a.annotation}});
    textEditors.forEach(t => {
        // TODO: see if we can change the behavior of markdown string so it has an onclick event to navigate to the annotation
        // const decorationOptions: vscode.DecorationOptions[] = ranges.
        //     filter(r => r.filename === t.document.uri.toString()).
        //     map(r => { return { range: r.range, hoverMessage: r.annotation } });
        // t.setDecorations(annotationDecorations, decorationOptions)
        addHighlightsToEditor(annotationsToHighlight, t);
    } );
		
}

export const handleChangeActiveTextEditor = (TextEditor: vscode.TextEditor | undefined) => {
    if(vscode.workspace.workspaceFolders) {
        if(TextEditor) {
            utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextEditor.document.uri.toString(), TextEditor.document);
            setAnnotationList(utils.sortAnnotationsByLocation(annotationList, TextEditor.document.uri.toString()));
            if(user && vscode.workspace.workspaceFolders)
                view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath));
        }
        else {
            utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', "all");
        }
    }
    setActiveEditor(TextEditor);
}

export const handleDidSaveDidClose = (TextDocument: vscode.TextDocument) => {
    if(vscode.workspace.workspaceFolders) utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString(), TextDocument);
}

export const handleDidChangeTextDocument = async (e: vscode.TextDocumentChangeEvent) => {
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
            const visiblePath: string = vscode.workspace.workspaceFolders ? utils.getVisiblePath(e.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath) : e.document.uri.fsPath;

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
                    const adjustedAnno = {
                        id: uuidv4(),
                        filename: e.document.uri.toString(),
                        visiblePath,
                        anchorText: change.text,
                        annotation: copiedAnnotations[0].annotation,
                        anchor: {
                            startLine,
                            startOffset,
                            endLine: actuallyUsefulRange.end.line,
                            endOffset: actuallyUsefulRange.end.character
                        },
                        deleted: false,
                        html: copiedAnnotations[0].html,
                        authorId: copiedAnnotations[0].authorId,
                        createdTimestamp: new Date().getTime(),
                        programmingLang: copiedAnnotations[0].programmingLang
                    }
                    rangeAdjustedAnnotations = copiedAnnotations.length > 1 ? anchor.splitRange(actuallyUsefulRange, copiedAnnotations, e.document.uri.toString(), change.text) : 
                    [utils.buildAnnotation(adjustedAnno)];
                    // annotationList = annotationList.concat(rangeAdjustedAnnotations);
                    didPaste = true;
                    // copiedAnnotations = []; // we pasted?
                }
            }
            const translatedAnnotations : Annotation[] = currentAnnotations.map(a => anchor.translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, 
                change.text.length, diff, change.rangeLength, a.anchorText, a.annotation, a.filename.toString(), visiblePath, a.id, a.createdTimestamp, a.html, e.document)).filter(a => !a.deleted);
            if(tempAnno) {
                const newTemp = anchor.translateChanges(tempAnno.startLine, tempAnno.endLine, tempAnno.startOffset, tempAnno.endOffset, startLine, endLine, startOffset, endOffset, 
                    change.text.length, diff, change.rangeLength, tempAnno.anchorText, tempAnno.annotation, tempAnno.filename.toString(), visiblePath, tempAnno.id, tempAnno.createdTimestamp, tempAnno.html, e.document)
                setTempAnno(newTemp);
            }
            setAnnotationList(translatedAnnotations.concat(annotationList.filter(a => a.filename !== e.document.uri.toString()), rangeAdjustedAnnotations));
            if(didPaste && vscode.window.activeTextEditor) {
                // const ranges = annotationList.map(a => anchor.createRangeFromAnnotation(a));
                // vscode.window.activeTextEditor?.setDecorations(annotationDecorations, ranges);
                addHighlightsToEditor(annotationList, vscode.window.activeTextEditor);
            }
            setAnnotationList(utils.sortAnnotationsByLocation(annotationList, e.document.uri.toString()));
            if(vscode.workspace.workspaceFolders)
                view?.updateDisplay(annotationList, utils.getVisiblePath(vscode.window.activeTextEditor?.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath)); 
            // if the user is on the process of creating an annotation, update that annotation as well
            
        }
    }
}

export const handleDidChangeTextEditorSelection = (e: vscode.TextEditorSelectionChangeEvent) => {
    // console.log('e', e);
}