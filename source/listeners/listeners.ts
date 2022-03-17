import * as vscode from 'vscode';
import { annotationList, copiedAnnotations, tempAnno, setTempAnno, setTabSize, user, view, setActiveEditor, setAnnotationList, deletedAnnotations, setDeletedAnnotationList, setInsertSpaces, changes, setChangeEvents, incrementNumChangeEventsCompleted, numChangeEventsCompleted } from '../extension';
import * as anchor from '../anchorFunctions/anchor';
import * as utils from '../utils/utils';
import { Annotation, AnchorObject, ChangeEvent, Snapshot } from '../constants/constants';
let gitDiff = require('git-diff');


export const handleChangeVisibleTextEditors = (textEditors: vscode.TextEditor[]) => {
    const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
    const textEditorProjectFileNames =  vscode.window.activeTextEditor ? textEditors.map(t => utils.getGithubUrl(utils.getVisiblePath(utils.getProjectName(t.document.uri.toString()), vscode.window.activeTextEditor?.document.uri.fsPath), utils.getProjectName(t.document.uri.toString()), true)) : []
    // nneed to decide if we want to write to DB that often... if(vscode.workspace.workspaceFolders !== undefined) utils.saveAnnotations(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json');
    // console.log('handleChangeVisibleText', textEditorProjectFileNames)
    const annotationsToHighlight = annotationList.filter(a => { 
        const filenames = utils.getAllAnnotationFilenames([a]);
        const gitUrls = utils.getAllAnnotationStableGitUrls([a]);
        return textEditorProjectFileNames.some(t => gitUrls.includes(t)) || textEditorFileNames.some(t => filenames.includes(t));
    });
    // console.log('annotationsToHighlight', annotationsToHighlight);
    if(!annotationsToHighlight.length) return;
    if(view) { 
        anchor.addHighlightsToEditor(annotationsToHighlight);
    }
}

export const handleChangeActiveTextEditor = (TextEditor: vscode.TextEditor | undefined) => {
    // console.log('handleChangeActive');
    if(vscode.workspace.workspaceFolders) {
        if(TextEditor) {
            if(TextEditor.options?.tabSize) setTabSize(TextEditor.options.tabSize);
            if(TextEditor.options?.insertSpaces) setInsertSpaces(TextEditor.options.insertSpaces);
            // utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextEditor.document.uri.toString(), TextEditor.document); // maybe don't need to do this here?
            // utils.findOutOfDateAnchors(annotationList.filter(a => a.filename === TextEditor.document.uri.toString()), TextEditor.document);
            setAnnotationList(utils.sortAnnotationsByLocation(annotationList, TextEditor.document.uri.toString())); // mark these annos as out of date
            const currentProject: string = utils.getProjectName(TextEditor.document.uri.fsPath);
            if(user && vscode.workspace.workspaceFolders)
            view?.updateDisplay(undefined, TextEditor.document.uri.toString(), currentProject);
        }
        // else {
        //     // utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', "all");
        // }
    }
    setActiveEditor(TextEditor);
}

export const handleDidSaveDidClose = (TextDocument: vscode.TextDocument) => {
    if(vscode.workspace.workspaceFolders) utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString(), TextDocument);
}

const checkIfComment = (changeObj: ChangeEvent) : boolean => {
    const addedText: string = changeObj.changes.map(c => c.text).join('').trimLeft();
    return addedText[0] === '/' && (addedText[1] === '/' || addedText[1] === '*');
}

const checkIfPartOfChange = (change: vscode.TextDocumentContentChangeEvent) : void => {
    const currTime: number = new Date().getTime();
    // console.log('changeObj at top', changeObj)
    if(!changes.length) {
        changes.push({ startTime: 0, endTime: 0, changes: [], isComment: false, complete: false });
    }

    let changeObj: ChangeEvent = changes[changes.length - 1];
    if(changeObj.startTime === 0) {
        changeObj.startTime = currTime;
        changeObj.changes.push(change);
    }
    else if((currTime - changeObj.startTime) >= 1000) {
        changeObj.endTime = currTime;
        changeObj.isComment = checkIfComment(changeObj);
        if(!changeObj.isComment && !changeObj.complete) {
            // setTimeout(() => vscode.window.showInformationMessage('Change task!'), 15000);
            setTimeout(async () => {
                let correctParticipantResult = false;
                while(!correctParticipantResult) {
                    const operandOne: number = parseInt(`${Math.floor(Math.random() * (9 - 2 + 1) + 2)}${Math.floor(Math.random() * (9 - 2 + 1) + 2)}`);
                    const operandTwo: number = parseInt(`${Math.floor(Math.random() * (9 - 2 + 1) + 2)}${Math.floor(Math.random() * (9 - 2 + 1) + 2)}`);
                    const result = operandTwo * operandOne;
                    const participantResult = await vscode.window.showInputBox({ ignoreFocusOut: true, placeHolder: 'Enter multiplication solution here', title: 'Interruption', prompt: `Solve this multiplaction problem: ${operandOne} x ${operandTwo}`});
                    correctParticipantResult = participantResult !== undefined && parseInt(participantResult) === result;
                    if(correctParticipantResult) {
                        changeObj.complete = true;
                        incrementNumChangeEventsCompleted();
                        setChangeEvents([{ startTime: 0, endTime: 0, changes: [], isComment: false, complete: false }]);
                    }
                }
            }, 15000);
        }
    }
    else {
        changeObj.changes.push(change); 
    }
}
    // hi
export const handleDidChangeTextDocument = (e: vscode.TextDocumentChangeEvent) => {
    const currentAnnotations = utils.getAllAnnotationsWithAnchorInFile(annotationList, e.document.uri.toString());
    const couldBeUndoOrPaste = utils.getAllAnnotationsWithAnchorInFile(deletedAnnotations, e.document.uri.toString()).length > 0 || copiedAnnotations.length > 0;
    if(!currentAnnotations.length && !tempAnno && !couldBeUndoOrPaste) { return } // no annotations could possibly be affected by this change
    else {
        let translatedAnnotations: Annotation[] = currentAnnotations;
        let rangeAdjustedAnnotations: Annotation[] = [];
        for (const change of e.contentChanges) {
            // console.log("BEGINNING DID CHANGE TEXT")
            // console.log('change', change);
            // if(numChangeEventsCompleted < 3) checkIfPartOfChange(change);
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;
            // console.log('wow', vscode.window.activeTextEditor?.document.positionAt(change.rangeOffset));
            // console.log('hmm', vscode.window.activeTextEditor?.document.positionAt(change.rangeOffset).translate(diff, change.text.length))
            // check to see if user pasted a copied or previously-deleted annotation... 

            if(utils.didUserPaste(change.text) && copiedAnnotations.length && change.text.length) { // make sure this isn't a cut w/o paste
                if(vscode.workspace.workspaceFolders) {
                    rangeAdjustedAnnotations = utils.reconstructAnnotations(copiedAnnotations, change.text, change.range, e.document.uri, vscode.workspace.workspaceFolders[0].uri, e.document);
                }
            }

            else if(deletedAnnotations.length) {
                const deletedAnnos = utils.checkIfChangeIncludesAnchor(deletedAnnotations, change.text);
                const currAnnoIds: string[] = currentAnnotations.map(a => a.id);
                if(deletedAnnos.length && vscode.workspace.workspaceFolders) {
                    deletedAnnos.forEach((a: Annotation) => { a.deleted = false; a.outOfDate = false });
                    rangeAdjustedAnnotations = deletedAnnos;
                    const deletedIds = deletedAnnos.map(a => a.id);
                    setDeletedAnnotationList(deletedAnnotations.filter((a: Annotation) => !deletedIds?.includes(a.id))); // undo stack has been popped
                }
                // probably did a cut paste which brought the anno back -- refresh list
                else if(deletedAnnotations.filter(a => currAnnoIds.includes(a.id)).length) {
                    setDeletedAnnotationList(deletedAnnotations.filter(a => !currAnnoIds.includes(a.id)));
                }
            }

            translatedAnnotations = utils.removeOutOfDateAnnotations(
                translatedAnnotations.map((a: Annotation) => {
                    const [anchorsToTranslate, anchorsNotToTranslate] = utils.partition(a.anchors, (a: AnchorObject) => a.filename === e.document.uri.toString());
                    const translatedAnchors = utils.removeNulls(anchorsToTranslate.map((a: AnchorObject) => anchor.translateChanges(a, change.range, 
                        change.text.length, diff, change.rangeLength, e.document, change.text)));
                    const needToUpdate = translatedAnchors.some(
                        t => anchorsToTranslate.find((o: AnchorObject) => t.anchorId === o.anchorId) ?
                         utils.objectsEqual(anchorsToTranslate.find((o: AnchorObject) => t.anchorId === o.anchorId).anchor, t.anchor) : true
                        )
                    // console.log('needToUpdate?',  needToUpdate);
                    let newSnapshots = null
                    if(a.codeSnapshots.length) {
                        newSnapshots = a.codeSnapshots.map((c: Snapshot) => {
                            const newText = a.anchors.find(anch => anch.anchorId === c.anchorId)?.anchorText;
                            console.log('newText', newText, 'anchorText', c.anchorText, 'diff', gitDiff(c.anchorText, newText));
                            return newText ? { ...c, diff: gitDiff(c.anchorText, newText )} : c
                        });
                    }
                    // console.log('newSnapshots', newSnapshots);
                    return utils.buildAnnotation({ ...a, needToUpdate, anchors: [...translatedAnchors, ...anchorsNotToTranslate], codeSnapshots: newSnapshots !== null ? newSnapshots : a.codeSnapshots })
                })
            );

            if(tempAnno && tempAnno.anchors[0].filename === e.document.uri.toString()) {
                const newAnchor = anchor.translateChanges(tempAnno.anchors[0], change.range, 
                    change.text.length, diff, change.rangeLength, e.document, change.text)
                if(newAnchor) setTempAnno({ ...tempAnno, anchors: [newAnchor] });
            }
            

        }

        // console.log('translated', translatedAnnotations, 'annotationList', annotationList, 'rangeAdjusted', rangeAdjustedAnnotations);
        const notUpdatedAnnotations: Annotation[] = utils.getAnnotationsNotInFile(annotationList, e.document.uri.toString());
        const newAnnotationList: Annotation[] = translatedAnnotations.concat(notUpdatedAnnotations, rangeAdjustedAnnotations);
        // console.log('new list', newAnnotationList);
        if(vscode.window.activeTextEditor && view)  {
            anchor.addHighlightsToEditor(newAnnotationList, vscode.window.activeTextEditor);
        }
        else {
            setAnnotationList(utils.sortAnnotationsByLocation(newAnnotationList, e.document.uri.toString()));
        }
    }
}

export const handleDidChangeTextEditorSelection = (e: vscode.TextEditorSelectionChangeEvent) => {
    
}

export const handleDidStartDebugSession = (e: vscode.DebugSession) : void => {
    console.log('got it', e);
}