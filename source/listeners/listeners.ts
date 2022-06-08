/*
 * 
 * listeners.ts
 * Callback functions for various VS Code events
 *
 */

import * as vscode from 'vscode';
import { annotationList, copiedAnnotations, tempAnno, setTempAnno, setTabSize, user, view, setActiveEditor, setAnnotationList, deletedAnnotations, setDeletedAnnotationList, setInsertSpaces, changes, setChangeEvents, incrementNumChangeEventsCompleted, numChangeEventsCompleted, setCurrentColorTheme, gitInfo } from '../extension';
import * as anchor from '../anchorFunctions/anchor';
import * as utils from '../utils/utils';
import { Annotation, AnchorObject, ChangeEvent, 
    // Timer 
} from '../constants/constants';
let timeSinceLastEdit: number = -1;
let tempChanges: any[] = [];
// Update our internal representation of the color theme so Shiki (our package for code formatting) uses appropriate colors 
export const handleDidChangeActiveColorTheme = (colorTheme: vscode.ColorTheme) => {
    // give editor time to update...
    setTimeout(() => { 
        setCurrentColorTheme(vscode.workspace.getConfiguration('workbench', vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri).colorTheme)
    }, 3000);
}

// Listens for a change in visible editors so we can highlight correct anchors for all visible files
export const handleChangeVisibleTextEditors = (textEditors: readonly vscode.TextEditor[]) => {
    const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
    const textEditorProjectFileNames = textEditors.map(t => utils.getStableGitHubUrl(t.document.uri.fsPath));
    console.log('textEditorProjectFileNames', textEditorProjectFileNames);
    const annotationsToHighlight = annotationList.filter(a => { 
        const filenames = utils.getAllAnnotationFilenames([a]);
        const gitUrls = utils.getAllAnnotationStableGitUrls([a]);
        return textEditorProjectFileNames.some(t => gitUrls.includes(t)) || textEditorFileNames.some(t => filenames.includes(t));
    });
    console.log('annotationsToHighlight', annotationsToHighlight)
    if(!annotationsToHighlight.length) return;
    if(view) { 
        console.log('annotationsToHighlight', annotationsToHighlight);
        textEditors.forEach(t => anchor.addHighlightsToEditor(annotationsToHighlight, t))
    }
}

// update Adamite pane such that annotations are in the correct project and file lists
export const handleChangeActiveTextEditor = (TextEditor: vscode.TextEditor | undefined) => {
    if(vscode.workspace.workspaceFolders) {
        if(TextEditor) {
            if(TextEditor.options?.tabSize) setTabSize(TextEditor.options.tabSize);
            if(TextEditor.options?.insertSpaces) setInsertSpaces(TextEditor.options.insertSpaces);
            // console.log('annotationList before set', annotationList);
            setAnnotationList(utils.sortAnnotationsByLocation(annotationList)); // mark these annos as out of date
            // console.log('list after', annotationList);
            const currentProject: string = utils.getProjectName(TextEditor.document.uri.fsPath);
            const gitUrl: string = utils.getGithubUrl(TextEditor.document.uri.fsPath, currentProject, true);
            console.log('changing active text editor');
            if(user && vscode.workspace.workspaceFolders)
            view?.updateDisplay(undefined, gitUrl, currentProject);
        }
    }
    setActiveEditor(TextEditor);
}

// In case where user saves or closes a window, save annotations to FireStore
export const handleDidSaveDidClose = (TextDocument: vscode.TextDocument) => {
    if(vscode.workspace.workspaceFolders) utils.handleSaveCloseEvent(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/test.json', TextDocument.uri.toString(), TextDocument);
}

const logChanges = (e: vscode.TextDocumentChangeEvent) : void => {
    let currentTime = new Date().getTime();
    const projectName: string = utils.getProjectName(e.document.uri.toString());
    if(timeSinceLastEdit === -1 || (currentTime - timeSinceLastEdit) <= 2000) {
        timeSinceLastEdit = currentTime;

        tempChanges.push(
            {
                text: e.contentChanges.map(c => c.text !== '' ? c.text : `Delete: removed ${c.rangeLength} characters`).join(' '),
                file: e.document.fileName,
                lines: e.contentChanges.map(c => c.range.start.line !== c.range.end.line ? c.range.start.line + ' to ' + c.range.end.line : `${c.range.start.line}` ).join(' '),
                characterChanges: e.contentChanges.flatMap(c => { return { added: c.text.length, removed: c.rangeLength }})
            }
        )
        // console.log('pushing to tempChanges', tempChanges);

    }
    else if((currentTime - timeSinceLastEdit) >= 2000) {
        timeSinceLastEdit = -1;
        const characterData = tempChanges.flatMap(a => a.characterChanges);
        setChangeEvents([...changes, {
            time: currentTime,
            textAdded: tempChanges.map(t => t.text).join(''),
            commit: gitInfo[projectName].commit,
            branch: gitInfo[projectName].branch,
            file: [ ... new Set(tempChanges.map(t => t.file))].join('; '),
            line: [ ... new Set(tempChanges.map(t => t.lines))].join('; '),
            charactersAdded: characterData.reduce((accumulator, t) => accumulator + t.added, 0),
            charactersRemoved: characterData.reduce((accumulator, t) => accumulator + t.removed, 0)
        }]);
        tempChanges = [];
    }


}

// When user edits a document, update corresponding annotations
export const handleDidChangeTextDocument = (e: vscode.TextDocumentChangeEvent) => {
    console.log('e', e);

    logChanges(e);
    if(e.document.fileName.includes('extension-output-')) return; // this listener also gets triggered when the output pane updates???? for some reason????
    // const hs = vscode.extensions.getExtension('draivin.hscopes')?.exports;
    // console.log(hs.getScopeAt(e.document, new vscode.Position(116, 20)))
    // console.log('getting scope for ' + e.document.getText(new vscode.Range(new vscode.Position(116, 0), new vscode.Position(116, 20))))
    // console.log('hs-grammar', hs.getGrammar());
    

    // const token: scopeInfo.Token = hs?.getScopeAt(e.document, new vscode.Position(98, 10));
    // const annos = utils.getAllAnnotationStableGitUrls(annotationList).filter(a => a.includes(utils.getGithubUrl(undefined, utils.getProjectName(), true)));
    // console.log('wtf', annos);
    const stableGitPath = utils.getStableGitHubUrl(e.document.uri.fsPath);
    console.log('lol?', stableGitPath);
    const annos = utils.getAllAnnotationsWithGitUrlInFile(annotationList, stableGitPath);
    console.log('mehhh', annos);
    const currentAnnotations = utils.getAllAnnotationsWithAnchorInFile(annotationList, e.document.uri.toString());
    const couldBeUndoOrPaste = utils.getAllAnnotationsWithAnchorInFile(deletedAnnotations, e.document.uri.toString()).length > 0 || copiedAnnotations.length > 0;
    if(!currentAnnotations.length && !tempAnno && !couldBeUndoOrPaste) { return } // no annotations could possibly be affected by this change
    else {
        let translatedAnnotations: Annotation[] = currentAnnotations;
        let rangeAdjustedAnnotations: Annotation[] = [];
        for (const change of e.contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;

            // check to see if user pasted a copied or previously-deleted annotation... 
            if(utils.didUserPaste(change.text) && copiedAnnotations.length && change.text.length) { // make sure this isn't a cut w/o paste
                if(vscode.workspace.workspaceFolders) {
                    rangeAdjustedAnnotations = utils.reconstructAnnotations(copiedAnnotations, change.text, change.range, e.document.uri, vscode.workspace.workspaceFolders[0].uri, e.document);
                }
            }
            // check to see if there's any deleted annotations that may be brought back
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

            // update and remove any annotation given the translate change handler in anchor.ts
            // mark any annotation that has changed for saving to FireStore
            translatedAnnotations = utils.removeOutOfDateAnnotations(
                translatedAnnotations.map((a: Annotation) => {
                    const [anchorsToTranslate, anchorsNotToTranslate] = utils.partition(a.anchors, 
                        // (a: AnchorObject) => a.filename === e.document.uri.toString()
                        (a: AnchorObject) => a.stableGitUrl === stableGitPath
                    );
                    const translate =  anchorsToTranslate.map((a: AnchorObject) => anchor.translateChanges(a, change.range, 
                        change.text.length, diff, change.rangeLength, e.document, change.text));
                    const translatedAnchors = utils.removeNulls(
                       translate
                    );
                    const needToUpdate = translatedAnchors.some(
                        t => anchorsToTranslate.find((o: AnchorObject) => t.anchorId === o.anchorId) ?
                         utils.objectsEqual(anchorsToTranslate.find((o: AnchorObject) => t.anchorId === o.anchorId).anchor, t.anchor) : true
                    )
                    return utils.buildAnnotation({ ...a, needToUpdate, anchors: [...translatedAnchors, ...anchorsNotToTranslate] })
                })
            );

            // if user is creating an annotation at edit time, update that annotation too
            if(tempAnno && tempAnno.anchors[0].stableGitUrl === stableGitPath) {
                const newAnchor = anchor.translateChanges(tempAnno.anchors[0], change.range, 
                    change.text.length, diff, change.rangeLength, e.document, change.text)
                if(newAnchor) setTempAnno({ ...tempAnno, anchors: [newAnchor] });
            }
            

        }

        
        const notUpdatedAnnotations: Annotation[] = utils.getAnnotationsNotInFile(annotationList, e.document.uri.toString());
        const newAnnotationList: Annotation[] = translatedAnnotations.concat(notUpdatedAnnotations, rangeAdjustedAnnotations);
        
        // highlight changed annotations
        if(vscode.window.activeTextEditor && view)  {
            anchor.addHighlightsToEditor(newAnnotationList, vscode.window.activeTextEditor);
        }
        else {
            setAnnotationList(utils.sortAnnotationsByLocation(newAnnotationList));
        }
    }
}
