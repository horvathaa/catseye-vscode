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
        setSelectedAnnotationsNavigations
} from '../extension';
import { initializeAnnotations, handleSaveCloseEvent, saveAnnotations, removeOutOfDateAnnotations, buildAnnotation, sortAnnotationsByLocation, getProjectName, getShikiCodeHighlighting, getAllAnnotationFilenames, createAnchorObject } from '../utils/utils';
import { addHighlightsToEditor, createAnchorFromRange, createRangeFromAnchorObject, createRangesFromAnnotation, updateAnchorInAnchorObject } from '../anchorFunctions/anchor';
import { v4 as uuidv4 } from 'uuid';
// let gitDiff = require('git-diff');
// import Anchor from '../view/app/components/annotationComponents/anchor';

export const handleAdamiteWebviewLaunch = () : void => {
    const currFilename: string | undefined = vscode.window.activeTextEditor?.document.uri.path.toString();
    view?._panel?.reveal();
    if(user) view?.reload(gitInfo.author, user.uid);
    if(vscode.workspace.workspaceFolders)
        view?.updateDisplay(annotationList, currFilename, getProjectName(vscode.window.activeTextEditor?.document.uri.fsPath));
    const annoFiles: string[] = getAllAnnotationFilenames(annotationList);
    console.log('annoFiles', annoFiles);
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        if(annoFiles.includes(v.document.uri.toString())) {
            addHighlightsToEditor(annotationList, v); 
        }
    });
}

export const handleCopyText = (text: string) : void => {
    vscode.env.clipboard.writeText(text);
	setStoredCopyText(text);
}

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
        console.log('newSnapshots', newSnapshots);
        const newAnno: Annotation = buildAnnotation({ ...anno, codeSnapshots: newSnapshots, needToUpdate: true });
        setAnnotationList(annotationList.filter(anno => anno.id !== id).concat([newAnno]));
    }
}

export const handleAddAnchor = async (id: string) : Promise<void> => {
    const anno: Annotation | undefined = annotationList.find(anno => anno.id === id);
    let currentSelection: vscode.Selection | undefined = vscode.window.activeTextEditor?.selection;
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
        // const anchor: AnchorObject = createAnchorFromRange(new vscode.Range(currentSelection.start, currentSelection.end));
    }
    else if(anno) {
        vscode.window.showInformationMessage('Select the code you want to add as an anchor!');
        return;
    }
}

export const handleScrollInEditor = (id: string, anchorId: string) : void => {
    const anno: Annotation | undefined = annotationList.find(anno => anno.id === id);
    const anchorObj: AnchorObject | undefined = anno?.anchors.find(a => a.anchorId === anchorId);
    if(anno && anchorObj) {
        const range = createRangeFromAnchorObject(anchorObj);
        const text = vscode.window.visibleTextEditors?.find(doc => doc.document.uri.toString() === anchorObj.filename);
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
            setAnnotationList(sortAnnotationsByLocation(annotationList, text?.document.uri.toString()));
            view?.updateDisplay(annotationList);
            addHighlightsToEditor(annotationList, text);
            if(willBePinned) {
                setSelectedAnnotationsNavigations([...selectedAnnotationsNavigations, { id: newAnno.id, lastVisited: false, anchorId: newAnno.anchors[0].anchorId } ]);
            }
        }
    });
}

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

export const handleDeleteAnnotation = (id: string) : void => {
    const updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], deleted: true, needToUpdate: true });
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    saveAnnotations(updatedList, ""); // bad - that should point to JSON but we are also not using that rn so whatever
    const annotationFiles: string[] = getAllAnnotationFilenames([updatedAnno]);
    const visible : vscode.TextEditor = vscode.window.visibleTextEditors.filter((v: vscode.TextEditor) => annotationFiles.includes(v.document.uri.toString()))[0];
    visible ? setAnnotationList(sortAnnotationsByLocation(removeOutOfDateAnnotations(updatedList), visible?.document.uri.toString())) : setAnnotationList(removeOutOfDateAnnotations(updatedList));
    view?.updateDisplay(annotationList);
    if(visible) {
        addHighlightsToEditor(annotationList, visible);
    }
    if(selectedAnnotationsNavigations.map(a => a.id).includes(id)) {
        setSelectedAnnotationsNavigations(selectedAnnotationsNavigations.filter(n => n.id !== id));
    }
}

export const handleCancelAnnotation = () : void => {
    // reset temp object and re-render
    setTempAnno(null);
    view?.updateDisplay(removeOutOfDateAnnotations(annotationList));
}

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

export const handleOnDidDispose = () : void => {
    handleSaveCloseEvent(annotationList);
    setView(undefined);
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        v.setDecorations(annotationDecorations, []);
    });
}

export const handleOnDidChangeViewState = () : void => {
        // known bug : will default to 0 annotations until a new window is made active again when the panel is dragged sigh
        // for now will do but should find a better solution (may consider switching to having vs code handle the state when 
        // panel is not active)
    user ? view?.reload(gitInfo.author, user.uid) : view?.init();
}

export const handleSaveAnnotationsToJson = () : void => {
    if(vscode.workspace.workspaceFolders) {
        saveAnnotations(annotationList, vscode.workspace.workspaceFolders[0].uri.path + '/output.json', true);
    }
}

export const handleShowKeyboardShortcuts = () : void => {
    console.log('todo... not even sure if this is possible');
}