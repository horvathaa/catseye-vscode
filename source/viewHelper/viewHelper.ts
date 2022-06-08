/*
 *
 * viewHelper.ts
 * Functions for handling when something happens in the adamite webview panel.
 * These are called in commands.ts in the listener we create when we create ViewLoader.
 *
 */
import * as vscode from 'vscode';
import firebase from 'firebase';
import { Annotation, AnchorObject, Reply, Snapshot } from '../constants/constants';
import { user, 
        gitInfo, 
        setStoredCopyText, 
        annotationList, 
        setAnnotationList, 
        view, 
        setView, 
        tempAnno, 
        setTempAnno, 
        annotationDecorations,
        selectedAnnotationsNavigations,
        setSelectedAnnotationsNavigations,
        outOfDateAnnotations,
        deletedAnnotations
} from '../extension';
import { 
    initializeAnnotations, 
    handleSaveCloseEvent, 
    saveAnnotations, 
    removeOutOfDateAnnotations, 
    buildAnnotation, 
    sortAnnotationsByLocation, 
    getProjectName, 
    getShikiCodeHighlighting, 
    getAllAnnotationFilenames, 
    createAnchorObject, 
    getAllAnnotationStableGitUrls,
    getGithubUrl,
    getStableGitHubUrl
} from '../utils/utils';
import { 
    addHighlightsToEditor, 
    createAnchorFromRange, 
    createRangeFromAnchorObject, 
    createRangesFromAnnotation, 
    updateAnchorInAnchorObject 
} from '../anchorFunctions/anchor';
import { v4 as uuidv4 } from 'uuid';

// Opens and reloads the webview -- this is invoked when the user uses the "Adamite: Launch Adamite" command (ctrl/cmd + shift + A).
export const handleAdamiteWebviewLaunch = () : void => {
    const currFilename: string | undefined = vscode.window.activeTextEditor?.document.uri.path.toString();
    view?._panel?.reveal();
    if(user) view?.reload(gitInfo.author, user.uid);
    if(vscode.workspace.workspaceFolders)
        view?.updateDisplay(annotationList, currFilename, getProjectName(vscode.window.activeTextEditor?.document.uri.fsPath));
    // const annoFiles: string[] = getAllAnnotationFilenames(annotationList);
    const annoUrls: string[] = getAllAnnotationStableGitUrls(annotationList);
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        if(annoUrls.includes(getStableGitHubUrl(v.document.uri.fsPath))) {
        // if(annoFiles.includes(v.document.uri.toString())) {
            // console.log('webview launch', annotationList);
            addHighlightsToEditor(annotationList, v); 
        }
    });
}

// Called when the user copies text from the Adamite panel
export const handleCopyText = (text: string) : void => {
    vscode.env.clipboard.writeText(text);
	setStoredCopyText(text);
}

// Update the annotation with a new snapshot of code on the extension side
export const handleSnapshotCode = (id: string, anchorId: string) : void => {
    const anno: Annotation | undefined = annotationList.find(anno => anno.id === id);
    const anchor: AnchorObject | undefined = anno?.anchors.find(a => a.anchorId === anchorId);
    if(anno && anchor) {
        const newSnapshots: Snapshot[] = anno.codeSnapshots ? anno.codeSnapshots.concat([{ 
            createdTimestamp: new Date().getTime(), 
            snapshot: anchor.html,
            anchorText: anchor.anchorText,
            githubUsername: gitInfo.author,
            comment: "",
            diff: "",
            id: uuidv4(),
            anchorId: anchor.anchorId,
            deleted: false
          }]) : [{ 
            createdTimestamp: new Date().getTime(), 
            snapshot: anchor.html,
            anchorText: anchor.anchorText,
            githubUsername: gitInfo.author,
            comment: "",
            diff: "",
            id: uuidv4(),
            anchorId: anchor.anchorId,
            deleted: false
        }];

        const newAnno: Annotation = buildAnnotation({ ...anno, codeSnapshots: newSnapshots, needToUpdate: true });
        setAnnotationList(annotationList.filter(anno => anno.id !== id).concat([newAnno]));
    }
}

// Add a new anchor to the annotation by looking at what is currently selected in the editor
// then creating a new anchor object and appending that to the annotation  
export const handleAddAnchor = async (id: string) : Promise<void> => {
    const anno: Annotation | undefined = annotationList.find(anno => anno.id === id);
    let currentSelection: vscode.Selection | undefined = vscode.window.activeTextEditor?.selection;
    // if we couldn't get a selection using activeTextEditor, try using first visibleTextEditor (which is usually the same as activeTextEditor)
    // have to do this because sometimes selecting the webview in order to click the "add anchor" button
    // takes away focus from the user's editor in which they selected text to add as an anchor
    if(!currentSelection) { 
        currentSelection = vscode.window.visibleTextEditors[0].selection;
    }
    if(anno && currentSelection && !currentSelection.start.isEqual(currentSelection.end)) {
        const newAnchor: AnchorObject | undefined =  await createAnchorObject(id, new vscode.Range(currentSelection.start, currentSelection.end));
        const newAnno: Annotation = newAnchor ? buildAnnotation({ ...anno, anchors: [...anno.anchors, newAnchor] }) : anno;
        if(!newAnchor) {
            console.error('could not make new anchor - returning original annotation...');
        }
        setAnnotationList(annotationList.filter(anno => anno.id !== id).concat([newAnno]));
        const textEditorToHighlight: vscode.TextEditor = vscode.window.activeTextEditor ? vscode.window.activeTextEditor : vscode.window.visibleTextEditors[0];
        if(newAnchor && textEditorToHighlight) addHighlightsToEditor(annotationList, textEditorToHighlight)
    }
    else if(anno) {
        vscode.window.showInformationMessage('Select the code you want to add as an anchor!');
        return;
    }
}

const getLocalPathFromGitHubUrl = (url: string) : string => {
    const gitProjects = Object.keys(gitInfo).filter(g => g !== 'author'); // if the user does not have the workspace open, i don't think this will work
    console.log('gitProjects', gitProjects);
    const match = gitProjects.find(g => url.includes(g));
    console.log('match', match);
    if(!match) return url;
    console.log('split', url.split(match))
    const urlSplit = url.split(match)[1];
    const cleanString = urlSplit.split('/tree/' + gitInfo[match].nameOfPrimaryBranch + '/')[1];
    const finalString = match.concat('/', cleanString);
    console.log('losing it', cleanString, finalString);
    console.log('urlSplit', urlSplit);
    const matchingDoc = vscode.workspace.textDocuments.find(document => document.uri.path.includes(finalString));
    console.log('matchingDoc', matchingDoc, 'text docs', vscode.workspace.textDocuments);
    if(!matchingDoc) return url;
    return matchingDoc.uri.toString();
}

// Navigate to the selected anchor's location
export const handleScrollInEditor = (id: string, anchorId: string) : void => {
    const anno: Annotation | undefined = annotationList.find(anno => anno.id === id); 
    const anchorObj: AnchorObject | undefined = anno?.anchors.find(a => a.anchorId === anchorId);
    if(anno && anchorObj) {
        const range = createRangeFromAnchorObject(anchorObj);
        console.log('whee');
        getLocalPathFromGitHubUrl(anchorObj.stableGitUrl);
        const text = vscode.window.visibleTextEditors?.find(doc => doc.document.uri.toString() === anchorObj.filename); // maybe switch to textDocuments
        if(!text) {
            vscode.workspace.openTextDocument(vscode.Uri.parse(anchorObj.filename.toString()))
            .then((doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, { preserveFocus: true, preview: true, selection: range, viewColumn: view?._panel?.viewColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Two : vscode.ViewColumn.One });
            });
        }
        else {
            text.revealRange(range, 1);
        }
    }
}

// Export annotation content above first anchor by inserting a new line and appending the content of the annotation
// then running VS Code's "comment" command in order to turn the text into a code comment
export const handleExportAnnotationAsComment = async (annoId: string) : Promise<void> => {
    const anno: Annotation = annotationList.filter(a => a.id === annoId)[0];
    if(!anno) return;
    const startingRange: vscode.Range = createRangesFromAnnotation(anno)[0];
    const insertionPoint: vscode.Position = new vscode.Position(startingRange.start.line, 0);
    const endingPoint: vscode.Position = new vscode.Position(startingRange.start.line, 1);
    const annotationFiles: string[] = getAllAnnotationFilenames([anno]); 
    const TextDocument: vscode.TextDocument = vscode.window.visibleTextEditors?.filter(doc => annotationFiles.includes(doc.document.uri.toString()))[0].document
    const TextEditor: vscode.TextEditor = await vscode.window.showTextDocument(TextDocument, { preserveFocus: false, selection: new vscode.Range(insertionPoint, endingPoint) });
    await vscode.commands.executeCommand('editor.action.insertLineBefore');
    const didInsert: boolean = await TextEditor.edit((editBuilder: vscode.TextEditorEdit) => {
        const startingRange: vscode.Range = createRangesFromAnnotation(anno)[0];
        const insertionPoint: vscode.Position = new vscode.Position(startingRange.start.line,  0); 
        editBuilder.insert(insertionPoint, anno.annotation);
    });
    if(didInsert) vscode.commands.executeCommand('editor.action.commentLine')
}

// Takes the temporary annotation created in commands -> createAnnotation and finishes it with
// the content the user added and whether or not the annotation will be pinned
export const handleCreateAnnotation = (annotationContent: string, willBePinned: boolean) : void => {
    if(!tempAnno) return;
    getShikiCodeHighlighting(tempAnno.anchors[0].filename.toString(), tempAnno.anchors[0].anchorText).then(html => {
        if(tempAnno) {
            let newAnno = tempAnno;
            newAnno.annotation = annotationContent;
            newAnno.selected = willBePinned;
            newAnno.anchors[0].html = html;
            setAnnotationList(annotationList.concat([newAnno]));
            const text = vscode.window.visibleTextEditors?.find(doc => doc.document.uri.toString() === tempAnno?.anchors[0].filename);
            setTempAnno(null);
            setAnnotationList(sortAnnotationsByLocation(annotationList));
            view?.updateDisplay(annotationList);
            if(text) addHighlightsToEditor(annotationList, text);
            if(willBePinned) {
                setSelectedAnnotationsNavigations([...selectedAnnotationsNavigations, { id: newAnno.id, lastVisited: false, anchorId: newAnno.anchors[0].anchorId } ]);
            }
        }
    });
}

// Generic function called when the user has either added content to their annotation or edited it
// the key is the field of the annotation model we want to update and value is what we will put in
// that field. When key is an array of strings, the user has edited their annotation so we update the annotation
// content and the sharing setting.
export const handleUpdateAnnotation = (id: string, key: string | string[], value: any) : void => {
    if(key === 'replies' || key === 'codeSnapshots') {
        value.forEach((obj: Reply | Snapshot) => {
            if(obj.id === "") {
                obj.id = uuidv4();
            }
        });
    }
    let updatedAnno: Annotation;
    if(typeof value === 'boolean' && typeof key === 'string') {
        updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], [key]: value, needToUpdate: true });
        setSelectedAnnotationsNavigations(
            value ? [...selectedAnnotationsNavigations, { id, lastVisited: false, anchorId: annotationList.filter(a => a.id === id)[0].anchors[0].anchorId }] : selectedAnnotationsNavigations.filter(a => a.id !== id) 
        );
    }
    else if(typeof key === 'string') {
        updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], [key]: value, needToUpdate: true });
    }
    else {
        updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], [key[0]]: value[key[0]], [key[1]]: value[key[1]], needToUpdate: true });
    }
    // console.log('updated', updatedAnno);
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    setAnnotationList(updatedList);
    if(typeof value === 'boolean' && typeof key === 'string')
    view?.updateDisplay(updatedList);
}

// Removes the annotation from the list, updates the annotation list in the webview, and removes the corresponding highlight
export const handleDeleteAnnotation = (id: string) : void => {
    const updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], deleted: true, needToUpdate: true });
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    saveAnnotations(updatedList, ""); // bad - that should point to JSON but we are also not using that rn so whatever
    const annotationFiles: string[] = getAllAnnotationFilenames([updatedAnno]);
    const visible : vscode.TextEditor = vscode.window.visibleTextEditors.filter((v: vscode.TextEditor) => annotationFiles.includes(v.document.uri.toString()))[0];
    visible ? 
        setAnnotationList(
            sortAnnotationsByLocation(
                removeOutOfDateAnnotations(updatedList)
            )
        ) : 
        setAnnotationList(
            removeOutOfDateAnnotations(updatedList)
        );
    view?.updateDisplay(annotationList);
    if(visible) {
        addHighlightsToEditor(annotationList, visible);
    }
    if(selectedAnnotationsNavigations.map(a => a.id).includes(id)) {
        setSelectedAnnotationsNavigations(selectedAnnotationsNavigations.filter(n => n.id !== id));
    }
}

// called when user decides not to create the annotation the started making
export const handleCancelAnnotation = () : void => {
    // reset temp object and re-render
    setTempAnno(null);
    view?.updateDisplay(removeOutOfDateAnnotations(annotationList));
}

// NOT USED ANYMORE 
// Previously was called  when the user signed in to the adamite pane,
// since we moved to the GitHub auth, this isn't used anymore
export const handleSignInWithEmailAndPassword = async (email: string, password: string) : Promise<void> => {
    try {
        const { user } = await firebase.auth().signInWithEmailAndPassword(email, password);
        user ? await initializeAnnotations(user) : setAnnotationList([]);
        handleAdamiteWebviewLaunch();
    } catch(e) {
        console.error(e);
        view?.logIn();
    }
}

// called when the webview pane is closed - data clean up
export const handleOnDidDispose = () : void => {
    handleSaveCloseEvent(annotationList);
    setView(undefined);
    if(tempAnno) setTempAnno(null);
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        v.setDecorations(annotationDecorations, []);
    });
}

// Event handler for when the webview changes states (visible to not visible)
export const handleOnDidChangeViewState = () : void => {
    user ? view?.reload(gitInfo.author, user.uid) : view?.init();
}

// exports annotations to a JSON file when selected from the sandwich menu
export const handleSaveAnnotationsToJson = () : void => {
    if(vscode.workspace.workspaceFolders) {
        saveAnnotations(annotationList.concat(outOfDateAnnotations).concat(deletedAnnotations), vscode.workspace.workspaceFolders[0].uri.path + '/output.json', true);
    }
}

// stub for adding this function later
export const handleShowKeyboardShortcuts = () : void => {
    return;
}