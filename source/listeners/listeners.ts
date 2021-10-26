import * as vscode from 'vscode';
import { annotationList, copiedAnnotations, tempAnno, setTempAnno, setTabSize, user, view, setActiveEditor, setAnnotationList, setCopiedAnnotationList, deletedAnnotations, setDeletedAnnotationList } from '../extension';
import * as anchor from '../anchorFunctions/anchor';
import * as utils from '../utils/utils';
import Annotation from '../constants/constants';


export const handleChangeVisibleTextEditors = async (textEditors: vscode.TextEditor[]) => {
    const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
    if(textEditors && textEditors.length && textEditors[0].options?.tabSize) setTabSize(textEditors[0].options.tabSize);
    // nneed to decide if we want to write to DB that often... if(vscode.workspace.workspaceFolders !== undefined) utils.saveAnnotations(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json');
    
    const annotationsToHighlight = annotationList.filter(a => textEditorFileNames.includes(a.filename.toString()));
    if(!annotationsToHighlight.length) return;
    // TODO: see if we can change the behavior of markdown string so it has an onclick event to navigate to the annotation
    anchor.addHighlightsToEditor(annotationsToHighlight);

		
}

export const handleChangeActiveTextEditor = (TextEditor: vscode.TextEditor | undefined) => {
    if(vscode.workspace.workspaceFolders) {
        if(TextEditor) {
            utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextEditor.document.uri.toString(), TextEditor.document);
            // utils.findOutOfDateAnchors(annotationList.filter(a => a.filename === TextEditor.document.uri.toString()), TextEditor.document);
            setAnnotationList(utils.sortAnnotationsByLocation(annotationList, TextEditor.document.uri.toString())); // mark these annos as out of date
            const currentProject: string = utils.getProjectName(TextEditor.document.uri.fsPath);
            console.log('textEditor', TextEditor);
            if(user && vscode.workspace.workspaceFolders)
                view?.updateDisplay(undefined, TextEditor.document.uri.toString(), currentProject);
        }
        else {
            console.log('in else');
            utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', "all");
        }
    }
    setActiveEditor(TextEditor);
}

export const handleDidSaveDidClose = (TextDocument: vscode.TextDocument) => {
    if(vscode.workspace.workspaceFolders) utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString(), TextDocument);
}

export const handleDidChangeTextDocument = (e: vscode.TextDocumentChangeEvent) => {
    const currentAnnotations = annotationList.filter(a => a.filename === e.document.uri.toString());
    const couldBeUndoOrPaste = deletedAnnotations.filter(a => a.filename === e.document.uri.toString()).length > 0 || copiedAnnotations.length > 0;
    if(!currentAnnotations.length && !tempAnno && !couldBeUndoOrPaste) { return } // no annotations could possibly be affected by this change
    else {
        let translatedAnnotations: Annotation[] = currentAnnotations;
        let rangeAdjustedAnnotations: Annotation[] = [];
        for (const change of e.contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const startOffset = change.range.start.character;
            const endOffset = change.range.end.character + change.text.length;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;
            const visiblePath: string = vscode.workspace.workspaceFolders ? utils.getVisiblePath(e.document.uri.fsPath, vscode.workspace.workspaceFolders[0].uri.fsPath) : e.document.uri.fsPath;
            // check to see if user pasted a copied or previously-deleted annotation... 

            let didPaste: boolean = false;
            let didUndo: boolean = false;
            if(utils.didUserPaste(change.text) && copiedAnnotations.length && change.text.length) { // make sure this isn't a cut w/o paste
                if(vscode.workspace.workspaceFolders) {
                    rangeAdjustedAnnotations = utils.reconstructAnnotations(copiedAnnotations, change.text, change.range, e.document.uri, vscode.workspace.workspaceFolders[0].uri, e.document);
                    didPaste = true;
                }
            }

            else if(deletedAnnotations.length) {
                const deletedAnnos = utils.checkIfChangeIncludesAnchor(deletedAnnotations, change.text);
                const currAnnoIds: string[] = currentAnnotations.map(a => a.id);
                if(deletedAnnos.length && vscode.workspace.workspaceFolders) {
                    deletedAnnos.forEach((a: Annotation) => { a.deleted = false; a.outOfDate = false });
                    rangeAdjustedAnnotations = deletedAnnos;
                    didUndo = true;
                    const deletedIds = deletedAnnos.map(a => a.id);
                    setDeletedAnnotationList(deletedAnnotations.filter((a: Annotation) => !deletedIds?.includes(a.id))); // undo stack has been popped
                }
                // probably did a cut paste which brought the anno back -- refresh list
                else if(deletedAnnotations.filter(a => currAnnoIds.includes(a.id)).length) {
                    setDeletedAnnotationList(deletedAnnotations.filter(a => !currAnnoIds.includes(a.id)));
                }
            }

            translatedAnnotations = utils.removeOutOfDateAnnotations(translatedAnnotations.map(a => anchor.translateChanges(a.startLine, a.endLine, a.startOffset, a.endOffset, startLine, endLine, startOffset, endOffset, 
                change.text.length, diff, change.rangeLength, a.anchorText, a.annotation, a.filename.toString(), visiblePath, a.id, a.createdTimestamp, a.html, e.document, change.text)));
            if(tempAnno) {
                const newTemp = anchor.translateChanges(tempAnno.startLine, tempAnno.endLine, tempAnno.startOffset, tempAnno.endOffset, startLine, endLine, startOffset, endOffset, 
                    change.text.length, diff, change.rangeLength, tempAnno.anchorText, tempAnno.annotation, tempAnno.filename.toString(), visiblePath, tempAnno.id, tempAnno.createdTimestamp, tempAnno.html, e.document, change.text)
                setTempAnno(newTemp);
            }
            

        }

        // console.log('translated', translatedAnnotations, 'annotationList', annotationList, 'rangeAdjusted', rangeAdjustedAnnotations);
        const newAnnotationList: Annotation[] = translatedAnnotations.concat(annotationList.filter(a => a.filename !== e.document.uri.toString()), rangeAdjustedAnnotations);
        // console.log('new list', newAnnotationList);
        if(vscode.window.activeTextEditor)  {
            anchor.addHighlightsToEditor(newAnnotationList, vscode.window.activeTextEditor);
        }
        else {
            setAnnotationList(utils.sortAnnotationsByLocation(newAnnotationList, e.document.uri.toString()));
        }
    }
}

export const handleDidChangeTextEditorSelection = (e: vscode.TextEditorSelectionChangeEvent) => {
    // console.log('e', e);
}