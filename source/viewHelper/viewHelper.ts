/*
 *
 * viewHelper.ts
 * Functions for handling when something happens in the catseye webview panel.
 * These are called in commands.ts in the listener we create when we create ViewLoader.
 *
 */
import * as vscode from 'vscode'
import firebase from 'firebase'
import {
    Annotation,
    AnchorObject,
    Reply,
    Snapshot,
    Type,
    Anchor,
    AnnotationAnchorPair,
    MergeInformation,
    isReply,
    ReanchorInformation,
    EventType,
} from '../constants/constants'
import {
    user,
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
    deletedAnnotations,
    setDeletedAnnotationList,
} from '../extension'
import {
    initializeAnnotations,
    handleSaveCloseEvent,
    saveAnnotations,
    removeOutOfDateAnnotations,
    buildAnnotation,
    // sortAnnotationsByLocation,
    getProjectName,
    getShikiCodeHighlighting,
    getAllAnnotationFilenames,
    createAnchorObject,
    getAllAnnotationStableGitUrls,
    // getGithubUrl,
    getStableGitHubUrl,
    // partition,
    objectsEqual,
    // getVisiblePath,
    createEvent,
} from '../utils/utils'
import {
    addHighlightsToEditor,
    addTempAnnotationHighlight,
    AnnotationRange,
    createAnchorFromRange,
    createRangeFromAnchorObject,
    createRangeFromObject,
    createRangesFromAnnotation,
    // updateAnchorInAnchorObject,
} from '../anchorFunctions/anchor'
import {
    emitEvent,
    saveAnnotations as fbSaveAnnotations,
} from '../firebase/functions/functions'
import { v4 as uuidv4 } from 'uuid'

// Opens and reloads the webview -- this is invoked when the user uses the "catseye: Launch catseye" command (ctrl/cmd + shift + A).
export const handlecatseyeWebviewLaunch = (): void => {
    const currFilename: string | undefined =
        vscode.window.activeTextEditor?.document.uri.path.toString()
    view?._panel?.reveal()
    if (user) view?.reload(gitInfo.author, user.uid)
    if (vscode.workspace.workspaceFolders)
        view?.updateDisplay(
            annotationList,
            currFilename,
            getProjectName(vscode.window.activeTextEditor?.document.uri.fsPath)
        )
    // const annoFiles: string[] = getAllAnnotationFilenames(annotationList);
    const annoUrls: string[] = getAllAnnotationStableGitUrls(annotationList)
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        if (annoUrls.includes(getStableGitHubUrl(v.document.uri.fsPath))) {
            addHighlightsToEditor(annotationList, v)
        }
    })
}

// Called when the user copies text from the catseye panel
export const handleCopyText = (text: string): void => {
    vscode.env.clipboard.writeText(text)
    setStoredCopyText(text)
}

// Update the annotation with a new snapshot of code on the extension side
// if bring back need to add update to latest commit code!
export const handleSnapshotCode = (id: string, anchorId: string): void => {
    const anno: Annotation | undefined = annotationList.find(
        (anno) => anno.id === id
    )
    const anchor: AnchorObject | undefined = anno?.anchors.find(
        (a) => a.anchorId === anchorId
    )
    if (anno && anchor) {
        const newSnapshots: Snapshot[] = anno.codeSnapshots
            ? anno.codeSnapshots.concat([
                  {
                      createdTimestamp: new Date().getTime(),
                      snapshot: anchor.html,
                      anchorText: anchor.anchorText,
                      githubUsername: gitInfo.author,
                      comment: '',
                      diff: '',
                      id: uuidv4(),
                      anchorId: anchor.anchorId,
                      deleted: false,
                  },
              ])
            : [
                  {
                      createdTimestamp: new Date().getTime(),
                      snapshot: anchor.html,
                      anchorText: anchor.anchorText,
                      githubUsername: gitInfo.author,
                      comment: '',
                      diff: '',
                      id: uuidv4(),
                      anchorId: anchor.anchorId,
                      deleted: false,
                  },
              ]

        const newAnno: Annotation = buildAnnotation({
            ...anno,
            codeSnapshots: newSnapshots,
            needToUpdate: true,
            lastEditTime: new Date().getTime(),
        })
        setAnnotationList(
            annotationList.filter((anno) => anno.id !== id).concat([newAnno])
        )
    }
}

// Add a new anchor to the annotation by looking at what is currently selected in the editor
// then creating a new anchor object and appending that to the annotation
export const handleAddAnchor = async (id: string): Promise<void> => {
    let currentSelection: vscode.Selection | undefined =
        vscode.window.activeTextEditor?.selection
    if (!currentSelection) {
        currentSelection = vscode.window.visibleTextEditors[0].selection
    }
    if (id.includes('merge')) {
        const newAnchor: AnchorObject | undefined = await createAnchorObject(
            id,
            new vscode.Range(currentSelection.start, currentSelection.end)
        )
        if (newAnchor) {
            view?.sendAnchorsToMergeAnnotation([newAnchor], [], [])
            const textEditorToHighlight: vscode.TextEditor = vscode.window
                .activeTextEditor
                ? vscode.window.activeTextEditor
                : vscode.window.visibleTextEditors[0]
            addTempAnnotationHighlight([newAnchor], textEditorToHighlight)
        } else {
            console.log('couldnt create anchor')
        }

        return
    }
    const anno: Annotation | undefined = annotationList.find(
        (anno) => anno.id === id
    )

    // if we couldn't get a selection using activeTextEditor, try using first visibleTextEditor (which is usually the same as activeTextEditor)
    // have to do this because sometimes selecting the webview in order to click the "add anchor" button
    // takes away focus from the user's editor in which they selected text to add as an anchor

    if (
        anno &&
        currentSelection &&
        !currentSelection.start.isEqual(currentSelection.end)
    ) {
        const newAnchor: AnchorObject | undefined = await createAnchorObject(
            id,
            new vscode.Range(currentSelection.start, currentSelection.end)
        )
        console.log('new anchor', newAnchor)
        const newAnno: Annotation = newAnchor
            ? buildAnnotation({
                  ...anno,
                  anchors: [...anno.anchors, newAnchor],
                  lastEditTime: new Date().getTime(),
              })
            : anno
        console.log('new annotation with anchor', newAnno)
        if (!newAnchor) {
            console.error(
                'could not make new anchor - returning original annotation...'
            )
        }
        setAnnotationList(
            annotationList.map((a) => (a.id === id ? newAnno : a))
            // filter((anno) => anno.id !== id).concat([newAnno])
        )
        console.log('annotation list after setting', annotationList)
        const textEditorToHighlight: vscode.TextEditor = vscode.window
            .activeTextEditor
            ? vscode.window.activeTextEditor
            : vscode.window.visibleTextEditors[0]
        if (newAnchor && textEditorToHighlight)
            addHighlightsToEditor(annotationList, textEditorToHighlight)
        view?.updateDisplay(annotationList)
    } else if (anno) {
        vscode.window.showInformationMessage(
            'Select the code you want to add as an anchor!'
        )
        return
    }
}

const getLocalPathFromGitHubUrl = async (url: string): Promise<string> => {
    const gitProjects = Object.keys(gitInfo).filter((g) => g !== 'author') // if the user does not have the workspace open, i don't think this will work
    const match = gitProjects.find((g) => url.includes(g))
    if (!match) return url
    const urlSplit = url.split(match)[1]
    const cleanString = urlSplit.split(
        '/tree/' + gitInfo[match].nameOfPrimaryBranch + '/'
    )[1]
    // const relativePath = match.concat('/', cleanString);
    const files = await vscode.workspace.findFiles(cleanString)
    return files[0].toString()
}

const scroll = (
    range: vscode.Range,
    filename: string,
    gitUrl: string
): void => {
    const text = vscode.window.visibleTextEditors?.find(
        (doc) => doc.document.uri.toString() === filename
    ) // maybe switch to textDocuments
    if (!text) {
        vscode.workspace.openTextDocument(vscode.Uri.parse(filename)).then(
            (doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, {
                    preserveFocus: true,
                    preview: true,
                    selection: range,
                    viewColumn:
                        view?._panel?.viewColumn === vscode.ViewColumn.One
                            ? vscode.ViewColumn.Two
                            : vscode.ViewColumn.One,
                })
                view?.updateDisplay(annotationList, filename)
            },
            async (reason: any) => {
                console.error('rejected', reason)
                const uri = await getLocalPathFromGitHubUrl(gitUrl) // this only works if the user has the specified github project open in vs code :-/
                vscode.workspace
                    .openTextDocument(vscode.Uri.parse(uri))
                    .then((doc: vscode.TextDocument) => {
                        vscode.window.showTextDocument(doc, {
                            preserveFocus: true,
                            preview: true,
                            selection: range,
                            viewColumn:
                                view?._panel?.viewColumn ===
                                vscode.ViewColumn.One
                                    ? vscode.ViewColumn.Two
                                    : vscode.ViewColumn.One,
                        })
                        view?.updateDisplay(annotationList, gitUrl)
                    })
            }
        )
        // fallback
    } else {
        text.revealRange(range, 1)
    }
}

export const handleScrollToRange = (
    anchor: Anchor,
    filename: string,
    gitUrl: string
) => {
    const range = createRangeFromObject(anchor)
    scroll(range, filename, gitUrl)
}

// Navigate to the selected anchor's location
export const handleScrollInEditor = async (
    id: string,
    anchorId: string
): Promise<void> => {
    const anno: Annotation | undefined = annotationList.find(
        (anno) => anno.id === id
    )
    const anchorObj: AnchorObject | undefined = anno?.anchors.find(
        (a) => a.anchorId === anchorId
    )
    if (anno && anchorObj) {
        const range = createRangeFromAnchorObject(anchorObj)
        scroll(range, anchorObj.filename, anchorObj.stableGitUrl)
    }
}

// could probably merge this and the original handleScrollInFile
export const handleScrollWithRangeAndFile = async (
    anchor: Anchor,
    gitUrl: string
): Promise<void> => {
    const range = createRangeFromObject(anchor)
    const uri = await getLocalPathFromGitHubUrl(gitUrl)
    const text = vscode.window.visibleTextEditors?.find(
        (doc) => doc.document.uri.toString() === uri
    )
    if (!text) {
        vscode.workspace.openTextDocument(vscode.Uri.parse(uri)).then(
            (doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, {
                    preserveFocus: true,
                    preview: true,
                    selection: range,
                    viewColumn:
                        view?._panel?.viewColumn === vscode.ViewColumn.One
                            ? vscode.ViewColumn.Two
                            : vscode.ViewColumn.One,
                })
                view?.updateDisplay(annotationList, gitUrl)
            },
            async (reason: any) => {
                console.error('Could not open text document', reason)
            }
        )
        // fallback
    } else {
        text.revealRange(range, 1)
    }
}

// Export annotation content above first anchor by inserting a new line and appending the content of the annotation
// then running VS Code's "comment" command in order to turn the text into a code comment
// there's def better ways of doing this
export const handleExportAnnotationAsComment = async (
    annoId: string
): Promise<void> => {
    const anno: Annotation = annotationList.filter((a) => a.id === annoId)[0]
    if (!anno) return
    const startingRange: vscode.Range = createRangesFromAnnotation(anno)[0]
    const insertionPoint: vscode.Position = new vscode.Position(
        startingRange.start.line,
        0
    )
    const endingPoint: vscode.Position = new vscode.Position(
        startingRange.start.line,
        1
    )
    const annotationFiles: string[] = getAllAnnotationFilenames([anno])
    const TextDocument: vscode.TextDocument =
        vscode.window.visibleTextEditors?.filter((doc) =>
            annotationFiles.includes(doc.document.uri.toString())
        )[0].document
    const TextEditor: vscode.TextEditor = await vscode.window.showTextDocument(
        TextDocument,
        {
            preserveFocus: false,
            selection: new vscode.Range(insertionPoint, endingPoint),
        }
    )
    await vscode.commands.executeCommand('editor.action.insertLineBefore')
    const didInsert: boolean = await TextEditor.edit(
        (editBuilder: vscode.TextEditorEdit) => {
            const startingRange: vscode.Range =
                createRangesFromAnnotation(anno)[0]
            const insertionPoint: vscode.Position = new vscode.Position(
                startingRange.start.line,
                0
            )
            editBuilder.insert(insertionPoint, anno.annotation)
        }
    )
    if (didInsert) vscode.commands.executeCommand('editor.action.commentLine')
}

// Takes the temporary annotation created in commands -> createAnnotation and finishes it with
// the content the user added and whether or not the annotation will be pinned
export const handleCreateAnnotation = (
    annotationContent: string,
    shareWith: string,
    willBePinned: boolean,
    types: Type[]
): void => {
    if (!tempAnno) return
    getShikiCodeHighlighting(
        tempAnno.anchors[0].filename.toString(),
        tempAnno.anchors[0].anchorText
    ).then((html) => {
        if (tempAnno) {
            let newAnno = tempAnno
            newAnno.annotation = annotationContent
            newAnno.selected = willBePinned
            newAnno.sharedWith = shareWith
            newAnno.anchors[0].html = html
            newAnno.types = types
            setAnnotationList(annotationList.concat([newAnno]))
            const text = vscode.window.visibleTextEditors?.find(
                (doc) =>
                    doc.document.uri.toString() ===
                    tempAnno?.anchors[0].filename
            )
            setTempAnno(null)
            setAnnotationList(annotationList)
            view?.updateDisplay(annotationList)
            if (text) addHighlightsToEditor(annotationList, text)
            if (willBePinned) {
                setSelectedAnnotationsNavigations([
                    ...selectedAnnotationsNavigations,
                    {
                        id: newAnno.id,
                        lastVisited: false,
                        anchorId: newAnno.anchors[0].anchorId,
                    },
                ])
            }
        }
    })
}

// Generic function called when the user has either added content to their annotation or edited it
// the key is the field of the annotation model we want to update and value is what we will put in
// that field. When key is an array of strings, the user has edited their annotation so we update the annotation
// content and the sharing setting.
export const handleUpdateAnnotation = (
    id: string,
    key: string | string[],
    value: any
): void => {
    if (key === 'replies' || key === 'codeSnapshots') {
        value.forEach((obj: Reply | Snapshot) => {
            if (obj.id.startsWith('temp')) {
                obj.id = uuidv4()
                if (isReply(obj)) {
                    obj.lastEditTime = new Date().getTime()
                }
            }
        })
    }
    let updatedAnno: Annotation | undefined = annotationList.find(
        (a) => a.id === id
    )
    if (updatedAnno) {
        // Check for pinned
        if (typeof value === 'boolean' && typeof key === 'string') {
            updatedAnno = buildAnnotation({
                ...updatedAnno,
                [key]: value,
                needToUpdate: true,
                gitCommit: gitInfo[updatedAnno.projectName]
                    ? gitInfo[updatedAnno.projectName].commit
                    : updatedAnno.gitCommit,
                lastEditTime: new Date().getTime(),
            })
            setSelectedAnnotationsNavigations(
                value
                    ? [
                          ...selectedAnnotationsNavigations,
                          {
                              id,
                              lastVisited: false,
                              anchorId: updatedAnno.anchors[0].anchorId,
                          },
                      ]
                    : selectedAnnotationsNavigations.filter((a) => a.id !== id)
            )
        } else if (typeof key === 'string') {
            key === 'types' && console.log('in update', value)
            updatedAnno = buildAnnotation({
                ...updatedAnno,
                [key]: value,
                needToUpdate: true,
                gitCommit: gitInfo[updatedAnno.projectName]
                    ? gitInfo[updatedAnno.projectName].commit
                    : updatedAnno.gitCommit,
                lastEditTime: new Date().getTime(),
            })
        } else {
            updatedAnno = buildAnnotation({
                ...updatedAnno,
                [key[0]]: value[key[0]],
                [key[1]]: value[key[1]],
                needToUpdate: true,
                gitCommit: gitInfo[updatedAnno.projectName]
                    ? gitInfo[updatedAnno.projectName].commit
                    : updatedAnno.gitCommit,
                lastEditTime: new Date().getTime(),
            })
        }
        const updatedList = annotationList
            .filter((a) => a.id !== id)
            .concat([updatedAnno])
        setAnnotationList(updatedList)
        // Update display if pinned or shared
        if (
            (typeof value === 'boolean' && typeof key === 'string') ||
            key === 'sharedWith'
        ) {
            view?.updateDisplay(updatedList)
        }
    }
}

// Removes the annotation from the list, updates the annotation list in the webview, and removes the corresponding highlight
export const handleDeleteResolveAnnotation = (
    id: string,
    resolve: boolean
): void => {
    const updatedAnno = buildAnnotation({
        ...annotationList.filter((a) => a.id === id)[0],
        needToUpdate: true,
        lastEditTime: new Date().getTime(),
    })

    if (resolve) {
        updatedAnno.resolved = true
    } else {
        updatedAnno.deleted = true
    }
    const updatedList = annotationList
        .filter((a) => a.id !== id)
        .concat([updatedAnno])
    saveAnnotations(updatedList, '') // bad - that should point to JSON but we are also not using that rn so whatever
    const annotationFiles: string[] = getAllAnnotationFilenames([updatedAnno])
    const visible: vscode.TextEditor = vscode.window.visibleTextEditors.filter(
        (v: vscode.TextEditor) =>
            annotationFiles.includes(v.document.uri.toString())
    )[0]

    setAnnotationList(removeOutOfDateAnnotations(updatedList))
    view?.updateDisplay(annotationList)
    if (visible) {
        addHighlightsToEditor(annotationList, visible)
    }
    if (selectedAnnotationsNavigations.map((a) => a.id).includes(id)) {
        setSelectedAnnotationsNavigations(
            selectedAnnotationsNavigations.filter((n) => n.id !== id)
        )
    }
}

// called when user decides not to create the annotation the started making
export const handleCancelAnnotation = (): void => {
    // reset temp object and re-render
    setTempAnno(null)
    view?.updateDisplay(removeOutOfDateAnnotations(annotationList))
}

// NOT USED ANYMORE
// Previously was called  when the user signed in to the catseye pane,
// since we moved to the GitHub auth, this isn't used anymore
export const handleSignInWithEmailAndPassword = async (
    email: string,
    password: string
): Promise<void> => {
    try {
        const { user } = await firebase
            .auth()
            .signInWithEmailAndPassword(email, password)
        user ? await initializeAnnotations(user) : setAnnotationList([])
        handlecatseyeWebviewLaunch()
    } catch (e) {
        console.error(e)
        view?.logIn()
    }
}

// called when the webview pane is closed - data clean up
export const handleOnDidDispose = (): void => {
    handleSaveCloseEvent(annotationList)
    setView(undefined)
    if (tempAnno) setTempAnno(null)
    vscode.window.visibleTextEditors.forEach((v: vscode.TextEditor) => {
        v.setDecorations(annotationDecorations, [])
    })
}

// Event handler for when the webview changes states (visible to not visible)
export const handleOnDidChangeViewState = (): void => {
    user ? view?.reload(gitInfo.author, user.uid) : view?.init()
}

// exports annotations to a JSON file when selected from the sandwich menu
export const handleSaveAnnotationsToJson = (): void => {
    if (vscode.workspace.workspaceFolders) {
        saveAnnotations(
            annotationList
                .concat(outOfDateAnnotations)
                .concat(deletedAnnotations),
            vscode.workspace.workspaceFolders[0].uri.path + '/output.json',
            true
        )
    }
}

// stub for adding this function later
export const handleShowKeyboardShortcuts = (): void => {
    return
}

// stub for adding this function later
export const handlePinAnnotation = (id: string): void => {
    const updatedAnno = buildAnnotation({
        ...annotationList.filter((a) => a.id === id)[0],
        needToUpdate: true,
        lastEditTime: new Date().getTime(),
    })
    updatedAnno.selected = !updatedAnno.selected

    const updatedList = annotationList
        .filter((a) => a.id !== id)
        .concat([updatedAnno])

    setAnnotationList(updatedList)

    if (updatedAnno.selected) {
        setSelectedAnnotationsNavigations([
            ...selectedAnnotationsNavigations,
            {
                id: updatedAnno.id,
                lastVisited: false,
                anchorId: updatedAnno.anchors[0].anchorId,
            },
        ])
    } else {
        // Taken from handleDeleteResolveAnnotation
        if (selectedAnnotationsNavigations.map((a) => a.id).includes(id)) {
            setSelectedAnnotationsNavigations(
                selectedAnnotationsNavigations.filter((n) => n.id !== id)
            )
        }
    }
    view?.updateDisplay(updatedList)
}

export const handleMergeAnnotation = (
    anno: Annotation,
    mergedAnnos: Map<string, MergeInformation>
): void => {
    const newAnnotationId = uuidv4()
    const anchorsCopy = anno.anchors.map((a) => {
        return {
            ...a,
            parentId: newAnnotationId,
            anchorId: uuidv4(),
        }
    })
    const projectName = getProjectName()
    const newAnnotation: Annotation = buildAnnotation({
        ...anno,
        anchors: anchorsCopy,
        id: newAnnotationId,
        githubUsername: gitInfo.author,
        authorId: user?.uid,
        gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : '',
        gitBranch: gitInfo[projectName]?.branch
            ? gitInfo[projectName]?.branch
            : '',
        gitCommit: gitInfo[projectName]?.commit
            ? gitInfo[projectName]?.commit
            : 'localChange',
        projectName: projectName,
    })

    const ids: string[] = []
    // tbd if this is correct -- may want to only delete an annotation when all of its content has been used?
    mergedAnnos.forEach((m, key) => {
        if (
            m.anchors.length ||
            (m.annotation && m.annotation.length) ||
            (m.replies && m.replies.length)
        ) {
            ids.push(key)
        }
    })

    const mergedAnnotations = annotationList
        .filter((a) => ids.includes(a.id))
        .map((a) => {
            return buildAnnotation({ ...a, deleted: true })
        })
    setDeletedAnnotationList(mergedAnnotations)
    fbSaveAnnotations(mergedAnnotations)
    setAnnotationList([
        ...annotationList.filter((a) => !ids.includes(a.id)),
        newAnnotation,
        // ...mergedAnnotations,
    ])
    const newEvent = createEvent(mergedAnnotations, EventType.merge)
    emitEvent(newEvent)
    view?.updateDisplay(annotationList)
    vscode.window.visibleTextEditors.forEach((t) => {
        addHighlightsToEditor(annotationList, t)
        addTempAnnotationHighlight([], t)
    })
}

interface AnnotationAnchorRange extends AnnotationRange {
    anchorId: string
}

const rangeOnlyContainsRange = (
    a: AnnotationAnchorRange,
    arr: AnnotationAnchorRange[]
): boolean => {
    return arr.some(
        (anno) => a.range.contains(anno.range) && !a.range.isEqual(anno.range)
    )
}

const rangeOnlyEqualsRange = (
    a: AnnotationAnchorRange,
    arr: AnnotationAnchorRange[]
): boolean => {
    return arr.some((anno) => a.range.isEqual(anno.range))
}

interface DupInfo {
    annoId: string
    anchorId: string
    duplicateOf: any
}

interface DuplicateInformation {
    uniqueIndices: number[]
    dups: DupInfo[]
}

const getIndicesOfUnique = (
    objArr: { [key: string]: any }[]
): DuplicateInformation => {
    let indices: number[] = []
    let dups: DupInfo[] = []
    let seen: { [key: string]: any }[] = [] // use this for debugging
    objArr.forEach((o, i) => {
        if (
            seen.every(
                (obj) =>
                    !objectsEqual(
                        createAnchorFromRange(o.range),
                        createAnchorFromRange(obj.range)
                    )
            )
        ) {
            indices.push(i)
            seen.push(o) // use this for debugging
        } else {
            dups.push({
                annoId: o.annotationId,
                anchorId: o.anchorId,
                duplicateOf: objArr.filter(
                    (s) =>
                        s.anchorId !== o.anchorId &&
                        s.annotationId !== o.annotationId &&
                        objectsEqual(
                            createAnchorFromRange(o.range),
                            createAnchorFromRange(s.range)
                        )
                ),
            })
        }
    })
    return { uniqueIndices: indices, dups }
}

export interface AnnotationAnchorDuplicatePair extends AnnotationAnchorPair {
    duplicateOf: AnnotationAnchorPair[]
}

export const handleFindMatchingAnchors = (annotations: Annotation[]): void => {
    const anchors = annotations.flatMap((a) => a.anchors)
    const annoAnchorRanges: AnnotationAnchorRange[] = anchors.map((anch) => {
        return {
            annotationId: anch.parentId,
            anchorId: anch.anchorId,
            range: createRangeFromAnchorObject(anch),
            anchorText: anch.anchorText,
        }
    })

    const contains = annoAnchorRanges.filter((a) => {
        return rangeOnlyContainsRange(a, annoAnchorRanges)
    })
    const equals = annoAnchorRanges.filter((a) => {
        return rangeOnlyEqualsRange(a, annoAnchorRanges)
    })
    // since equals will have duplicates of each range, we only want one of each
    // const equalRanges = equals.map((a) => createAnchorFromRange(a.range))
    const uniqueIndices = getIndicesOfUnique(equals)
    const anchorsToTransmit: AnnotationAnchorRange[] = equals
        .filter((a, i) => uniqueIndices.uniqueIndices.includes(i))
        .concat(contains) // may need to do some cleanup of contains too
    // .map((a) => a.anchorId)
    const removedIds = equals
        .filter((a, i) => !uniqueIndices.uniqueIndices.includes(i))
        .map((a, i) => {
            return {
                annoAnchor: a,
                duplicateOf: uniqueIndices.dups.find(
                    (d) =>
                        d.annoId === a.annotationId && d.anchorId === a.anchorId
                )?.duplicateOf,
            }
        })
    // .map((a) => a.anchorId)

    let annoIds = new Set<string>()
    const anchorsThatWereUsedButNotTransmitting: AnnotationAnchorDuplicatePair[] =
        removedIds.map((id) => {
            annoIds.add(id.annoAnchor.annotationId)
            return {
                anchorId: id.annoAnchor.anchorId,
                annoId: id.annoAnchor.annotationId,
                duplicateOf: id.duplicateOf.map((a: any) => {
                    // remove anys later
                    return { annoId: a.annotationId, anchorId: a.anchorId }
                }),
            }
        })

    const anchorIdsThatWeAreSending = anchorsToTransmit.map((id) => {
        annoIds.add(id.annotationId)
        return id.anchorId
    })
    const anchorObjs = anchors.filter((a) =>
        anchorIdsThatWeAreSending.includes(a.anchorId)
    )
    const annoIdArr = [...annoIds]
    view?.sendAnchorsToMergeAnnotation(
        anchorObjs,
        anchorsThatWereUsedButNotTransmitting,
        annoIdArr
    )
}

export const handleReanchor = (
    annoId: string,
    newAnchor: ReanchorInformation
): void => {
    // find anno to update
    const anno = annotationList.find((a) => a.id === annoId)
    if (anno) {
        // find anchor to update
        const anchorToReplace = anno.anchors.find(
            (a) => a.anchorId === newAnchor.anchorId
        )
        if (anchorToReplace) {
            // merge old anchor with new, reanchor information, reset potentialReanchorSpots, and mark as anchored
            const newAnchorObj: AnchorObject = {
                ...anchorToReplace,
                ...newAnchor,
                potentialReanchorSpots: [],
                anchored: true,
            }
            // update corresponding anno
            const updatedAnno = buildAnnotation({
                ...anno,
                anchors: anno.anchors
                    .filter((a) => a.anchorId !== newAnchor.anchorId)
                    .concat(newAnchorObj),
                needToUpdate: true,
            })
            // console.log('updated', updatedAnno)
            // update list
            setAnnotationList(
                annotationList
                    .filter((a) => a.id !== anno.id)
                    .concat(updatedAnno)
            )
            // send updated list to front-end
            view?.updateDisplay(annotationList)
            // if reanchor is in visible location, add new highlights
            const currTextEditor: vscode.TextEditor =
                vscode.window.activeTextEditor ??
                vscode.window.visibleTextEditors[0]
            console.log('currText', currTextEditor)
            newAnchor.stableGitUrl ===
                getStableGitHubUrl(currTextEditor.document.uri.fsPath) &&
                addHighlightsToEditor(annotationList, currTextEditor)
        }
    }
}
