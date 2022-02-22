import * as vscode from 'vscode';
import firebase from 'firebase';
import Annotation from '../constants/constants';
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
import { initializeAnnotations, handleSaveCloseEvent, saveAnnotations, removeOutOfDateAnnotations, buildAnnotation, sortAnnotationsByLocation, getProjectName, getShikiCodeHighlighting } from '../utils/utils';
import { addHighlightsToEditor, createRangeFromAnnotation } from '../anchorFunctions/anchor';
import { v4 as uuidv4 } from 'uuid';
// import Anchor from '../view/app/components/annotationComponents/anchor';

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

export const handleCopyText = (text: string) : void => {
    vscode.env.clipboard.writeText(text);
	setStoredCopyText(text);
}

export const handleSnapshotCode = (id: string) : void => {
    const anno: Annotation | null = annotationList.filter(anno => anno.id === id)[0];
    if(anno) {
        const updatedAnnotation: Annotation = buildAnnotation({...anno, codeSnapshots: anno.codeSnapshots.concat({ createdTimestamp: new Date().getTime(), snapshot: anno.html })});
        setAnnotationList(annotationList.filter(anno => anno.id !== id).concat([updatedAnnotation]));
    }
}

export const handleScrollInEditor = (id: string) : void => {
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

export const handleExportAnnotationAsComment = async (annoId: string) : Promise<void> => {
    const anno: Annotation = annotationList.filter(a => a.id === annoId)[0];
    if(!anno) return;
    const startingRange: vscode.Range = createRangeFromAnnotation(anno);
    const insertionPoint: vscode.Position = new vscode.Position(startingRange.start.line, 0);
    const endingPoint: vscode.Position = new vscode.Position(startingRange.start.line, 1); 
    const TextDocument: vscode.TextDocument = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === anno?.filename)[0].document
    const TextEditor: vscode.TextEditor = await vscode.window.showTextDocument(TextDocument, { preserveFocus: false, selection: new vscode.Range(insertionPoint, endingPoint) });
    await vscode.commands.executeCommand('editor.action.insertLineBefore');
    const didInsert: boolean = await TextEditor.edit((editBuilder: vscode.TextEditorEdit) => {
        const startingRange: vscode.Range = createRangeFromAnnotation(anno);
        const insertionPoint: vscode.Position = new vscode.Position(startingRange.start.line,  0); 
        editBuilder.insert(insertionPoint, anno.annotation);
    });
    // const thisIsStupid: vscode.Selection = new vscode.Selection(insertionPoint, endingPoint);
    if(didInsert)
    vscode.commands.executeCommand('editor.action.commentLine').then((value) => {
        const updatedAnno: Annotation = buildAnnotation({ ...anno, startLine: anno.startLine + 1, endLine: anno.endLine + 1 });
        console.log('updatedAnno', updatedAnno);
        setAnnotationList(annotationList.filter(a => a.id !== annoId).concat([updatedAnno]));
        console.log(annotationList);
        addHighlightsToEditor(annotationList, TextEditor);
        view?.updateDisplay(annotationList);
    })
}

export const handleCreateAnnotation = (annotationContent: string, willBePinned: boolean) : void => {
    if(!tempAnno) return;
    getShikiCodeHighlighting(tempAnno.filename.toString(), tempAnno.anchorText).then(html => {
        if(tempAnno) {
            let newAnno = tempAnno;
            newAnno.annotation = annotationContent;
            newAnno.selected = willBePinned;
            newAnno.html = html;
            setAnnotationList(annotationList.concat([newAnno]));
            const text = vscode.window.visibleTextEditors?.filter(doc => doc.document.uri.toString() === tempAnno?.filename)[0];
            setTempAnno(null);
            setAnnotationList(sortAnnotationsByLocation(annotationList, text.document.uri.toString()));
            view?.updateDisplay(annotationList);
            addHighlightsToEditor(annotationList, text);
            if(willBePinned) {
                setSelectedAnnotationsNavigations([...selectedAnnotationsNavigations, { id: newAnno.id, lastVisited: false } ]);
            }
        }
    });
}

export const handleUpdateAnnotation = (id: string, key: string | string[], value: any) : void => {
    if(key === 'replies') {
        value.forEach((r: {[key: string]: any}) => {
            if(r.id === "") {
                r.id = uuidv4();
            }
        });
    }
    let updatedAnno: Annotation;
    console.log('key', key, 'value', value);
    console.log('typeof key', typeof key);
    if(typeof value === 'boolean' && typeof key === 'string') {
        updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], [key]: value });
        setSelectedAnnotationsNavigations(
            value ? [...selectedAnnotationsNavigations, { id, lastVisited: false}] : selectedAnnotationsNavigations.filter(a => a.id !== id) 
        );
        console.log('new selectednav', selectedAnnotationsNavigations);
    }
    else if(typeof key === 'string') {
        updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], [key]: value });
    }
    else {
        updatedAnno = buildAnnotation({ ...annotationList.filter(a => a.id === id)[0], [key[0]]: value[key[0]], [key[1]]: value[key[1]] });
    }
    // console.log('updated', updatedAnno);
    const updatedList = annotationList.filter(a => a.id !== id).concat([updatedAnno]);
    setAnnotationList(updatedList);
    if(typeof value === 'boolean' && typeof key === 'string')
    view?.updateDisplay(updatedList);
}

export const handleDeleteAnnotation = (id: string) : void => {
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