import * as vscode from 'vscode';
import firebase from 'firebase';
import { user, gitInfo, annotationList, setAnnotationList, view, setView, tempAnno, setTempAnno, annotationDecorations } from '../extension';
import { initializeAnnotations, handleSaveCloseEvent, saveAnnotations, removeOutOfDateAnnotations, buildAnnotation, sortAnnotationsByLocation, getProjectName, getShikiCodeHighlighting } from '../utils/utils';
import { addHighlightsToEditor, createRangeFromAnnotation } from '../anchorFunctions/anchor';
import { v4 as uuidv4 } from 'uuid';

export const handleAdamiteWebviewLaunch = () : void => {
    const currFilename: string | undefined = vscode.window.activeTextEditor?.document.uri.path.toString();
    view?._panel?.reveal();
    if(user) view?.reload(gitInfo.author, user.uid);
    if(vscode.workspace.workspaceFolders)
        view?.updateDisplay(annotationList, currFilename, getProjectName(vscode.window.activeTextEditor?.document.uri.fsPath));
    const annoFiles: string[] = annotationList.map(a => a.filename.toString());
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        if(annoFiles.includes(v.document.uri.toString())) {
            addHighlightsToEditor(annotationList, v); 
        }
    });
}

export const scrollInEditor = (id: string) : void => {
    const anno = annotationList.filter(anno => anno.id === id)[0];
    if(anno) {
        const range = createRangeFromAnnotation(anno);
        const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === anno.filename)[0];
        if(!text) {
            vscode.workspace.openTextDocument(vscode.Uri.parse(anno.filename.toString()))
            .then((doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, { preserveFocus: true, preview: true, selection: range, viewColumn: view?._panel?.viewColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Two : vscode.ViewColumn.One });
            });
        }
        else {
            text.revealRange(range, 1);
        }
    }
}

export const createAnnotation = (annotationContent: string) : void => {
    if(!tempAnno) return
    getShikiCodeHighlighting(tempAnno.filename.toString(), tempAnno.anchorText).then(html => {
        if(tempAnno) {
            let newAnno = tempAnno;
            newAnno.annotation = annotationContent;
            newAnno.html = html;
            setAnnotationList(annotationList.concat([newAnno]));
            const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === tempAnno?.filename)[0];
            setTempAnno(null);
            setAnnotationList(sortAnnotationsByLocation(annotationList, text.document.uri.toString()));
            view?.updateDisplay(annotationList);
            addHighlightsToEditor(annotationList, text);
        }
    });
}

export const updateAnnotation = (id: string, annotationContent: string) : void => {
    const updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], annotation: annotationContent });
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    setAnnotationList(updatedList);
}

export const deleteAnnotation = (id: string) : void => {
    const updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], deleted: true });
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    saveAnnotations(updatedList, ""); // bad - that should point to JSON but we are also not using that rn so whatever
    const visible : vscode.TextEditor = vscode.window.visibleTextEditors.filter((v: vscode.TextEditor) => v.document.uri.toString() === updatedAnno.filename)[0];
    visible ? setAnnotationList(sortAnnotationsByLocation(removeOutOfDateAnnotations(updatedList), visible?.document.uri.toString())) : setAnnotationList(removeOutOfDateAnnotations(updatedList));
    view?.updateDisplay(annotationList);
    if(visible) {
        addHighlightsToEditor(annotationList, visible);
    }
}

export const updateReplies = (id: string, replies: {[key: string] : any}[]) : void => {
    replies.forEach((r: {[key: string]: any}) => {
        if(r.id === "") {
            r.id = uuidv4();
        }
    });
    
    const updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], replies: replies });
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    setAnnotationList(updatedList);
}

export const cancelAnnotation = () : void => {
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