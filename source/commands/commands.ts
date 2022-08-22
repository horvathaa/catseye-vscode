/*
 *
 * commands.ts
 * Commands that the VS Code extension runs
 *
 */

import {
    gitInfo,
    annotationList,
    view,
    user,
    setView,
    setTempAnno,
    setAnnotationList,
    setCopiedAnnotationList,
    copiedAnnotations,
    setStoredCopyText,
    adamiteLog,
    selectedAnnotationsNavigations,
    setSelectedAnnotationsNavigations,
    astHelper,
} from '../extension'
import { AnchorObject, Annotation } from '../constants/constants'
import * as anchor from '../anchorFunctions/anchor'
import * as vscode from 'vscode'
import * as utils from '../utils/utils'
import ViewLoader from '../view/ViewLoader'
import * as viewHelper from '../viewHelper/viewHelper'
import { v4 as uuidv4 } from 'uuid'
import { initializeAuth } from '../authHelper/authHelper'

// on launch, create auth session and sign in to FireStore
export const init = async () => {
    adamiteLog.appendLine('Calling init')
    await initializeAuth()

    if (view) {
        view._panel?.reveal()
    }
}

// Creates Adamite side panel and sets up its listeners
export const createView = async (context: vscode.ExtensionContext) => {
    if (vscode.workspace.workspaceFolders) {
        if (view) {
            adamiteLog.appendLine('Revealing Adamite panel.')
            view._panel?.reveal()
            return
        }
        adamiteLog.appendLine('Creating new panel')
        const newView: ViewLoader = new ViewLoader(
            vscode.workspace.workspaceFolders[0].uri,
            context.extensionPath
        )
        setView(newView)
        if (newView) {
            /***********************************************************************************/
            /**************************************** VIEW LISTENERS ******************************/
            /*************************************************************************************/
            newView._panel?.webview.onDidReceiveMessage((message) => {
                switch (message.command) {
                    case 'scrollInEditor': {
                        const { id, anchorId } = message
                        viewHelper.handleScrollInEditor(id, anchorId)
                        break
                    }
                    case 'emailAndPassReceived': {
                        const { email, pass } = message
                        viewHelper.handleSignInWithEmailAndPassword(email, pass)
                        break
                    }
                    case 'copyTextFromWebview': {
                        const { text } = message
                        viewHelper.handleCopyText(text)
                    }
                    case 'exportAnnotationAsComment': {
                        const { annoId } = message
                        viewHelper.handleExportAnnotationAsComment(annoId)
                        break
                    }
                    case 'addAnchor': {
                        const { annoId } = message
                        viewHelper.handleAddAnchor(annoId)
                        break
                    }
                    case 'snapshotCode': {
                        const { annoId, anchorId } = message
                        viewHelper.handleSnapshotCode(annoId, anchorId)
                        break
                    }
                    case 'createAnnotation': {
                        const { anno, shareWith, willBePinned, types } = message
                        viewHelper.handleCreateAnnotation(
                            anno,
                            shareWith,
                            willBePinned,
                            types
                        )
                        break
                    }
                    case 'updateAnnotation': {
                        const { annoId, key, value } = message
                        viewHelper.handleUpdateAnnotation(annoId, key, value)
                        break
                    }
                    case 'deleteAnnotation': {
                        const { annoId } = message
                        viewHelper.handleDeleteResolveAnnotation(annoId, false)
                        break
                    }
                    case 'cancelAnnotation': {
                        viewHelper.handleCancelAnnotation()
                        break
                    }
                    case 'saveAnnotationsToJson': {
                        viewHelper.handleSaveAnnotationsToJson()
                        break
                    }
                    case 'showKeyboardShortcuts': {
                        viewHelper.handleShowKeyboardShortcuts()
                        break
                    }
                    case 'resolveAnnotation': {
                        const { annoId } = message
                        viewHelper.handleDeleteResolveAnnotation(annoId, true)
                        break
                    }
                    case 'shareAnnotation': {
                        const { annoId } = message
                        viewHelper.handleDeleteResolveAnnotation(annoId, true)
                        break
                    }
                    case 'mergeAnnotation': {
                        const { anno, mergedAnnotations } = message
                        viewHelper.handleMergeAnnotation(
                            anno,
                            new Map(Object.entries(mergedAnnotations))
                        )
                        break
                    }
                    case 'findMatchingAnchors': {
                        const { annotations } = message
                        viewHelper.handleFindMatchingAnchors(annotations)
                        break
                    }
                    case 'scrollWithRangeAndFile': {
                        const { anchor, gitUrl } = message
                        viewHelper.handleScrollWithRangeAndFile(anchor, gitUrl)
                        break
                    }
                    default: {
                        break
                    }
                }
            })

            // since we launched Adamite, show highlights in editor
            if (vscode.window.activeTextEditor) {
                // console.log('launch + active', annotationList);
                anchor.addHighlightsToEditor(
                    annotationList,
                    vscode.window.activeTextEditor
                )
            } else {
                console.log('no active text', annotationList)
                vscode.window.visibleTextEditors.forEach((t) =>
                    anchor.addHighlightsToEditor(annotationList, t)
                )
            }
            newView._panel?.onDidDispose(
                (e: void) => {
                    viewHelper.handleOnDidDispose()
                },
                null,
                context.subscriptions
            )

            newView._panel?.onDidChangeViewState(
                (e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
                    viewHelper.handleOnDidChangeViewState()
                }
            )
        }
    }
}

// user has expressed they want to annotate something - get Adamite side panel init'ed for that operation
export const createNewAnnotation = async () => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor) {
        vscode.window.showInformationMessage('No text editor is open!')
        return
    }
    if (!view) {
        await vscode.commands.executeCommand('adamite.launch')
    } else if (!view?._panel?.visible) {
        view?._panel?.reveal(vscode.ViewColumn.Beside)
    }

    const text = activeTextEditor.document.getText(activeTextEditor.selection)
    // annotating open script tag close script tag breaks the extension :-(
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(text)) {
        vscode.window.showInformationMessage('Cannot annotate full script tag!')
        return
    }
    const newAnnoId: string = uuidv4()
    const r = new vscode.Range(
        activeTextEditor.selection.start,
        activeTextEditor.selection.end
    )
    utils
        .getShikiCodeHighlighting(
            activeTextEditor.document.uri.toString(),
            text
        )
        .then((html: string) => {
            const projectName: string = utils.getProjectName(
                activeTextEditor.document.uri.fsPath
            )
            const programmingLang: string = activeTextEditor.document.uri
                .toString()
                .split('.')[
                activeTextEditor.document.uri.toString().split('.').length - 1
            ]
            const visiblePath: string = vscode.workspace.workspaceFolders
                ? utils.getVisiblePath(
                      projectName,
                      activeTextEditor.document.uri.fsPath
                  )
                : activeTextEditor.document.uri.fsPath
            const anc = anchor.createAnchorFromRange(r)
            const anchorId = uuidv4()
            const createdTimestamp = new Date().getTime()
            const surrounding = {
                linesBefore: anchor.getSurroundingLinesBeforeAnchor(
                    activeTextEditor.document,
                    r
                ),
                linesAfter: anchor.getSurroundingLinesAfterAnchor(
                    activeTextEditor.document,
                    r
                ),
            }
            const stableGitUrl = utils.getGithubUrl(
                visiblePath,
                projectName,
                true
            )
            const anchorObject: AnchorObject = {
                anchor: anc,
                anchorText: text,
                html,
                filename: activeTextEditor.document.uri.toString(),
                gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
                stableGitUrl,
                gitRepo: gitInfo[projectName]?.repo
                    ? gitInfo[projectName]?.repo
                    : '',
                gitBranch: gitInfo[projectName]?.branch
                    ? gitInfo[projectName]?.branch
                    : '',
                gitCommit: gitInfo[projectName]?.commit
                    ? gitInfo[projectName]?.commit
                    : 'localChange',
                anchorPreview: utils.getFirstLineOfHtml(
                    html,
                    !text.includes('\n')
                ),
                visiblePath,
                anchorId: anchorId,
                originalCode: html,
                parentId: newAnnoId,
                programmingLang,
                anchored: true,
                createdTimestamp: createdTimestamp,
                priorVersions: [
                    {
                        id: anchorId,
                        createdTimestamp: createdTimestamp,
                        html: html,
                        anchorText: text,
                        commitHash: gitInfo[projectName]?.commit
                            ? gitInfo[projectName]?.commit
                            : 'localChange',
                        branchName: gitInfo[projectName]?.branch
                            ? gitInfo[projectName]?.branch
                            : '',
                        anchor: anc,
                        stableGitUrl,
                        path: visiblePath,
                        surroundingCode: surrounding,
                    },
                ],
                path: astHelper.generateCodeContextPath(
                    r,
                    activeTextEditor.document
                ),
                potentialReanchorSpots: [],
                surroundingCode: surrounding,
            }
            const temp = {
                id: newAnnoId,
                anchors: [anchorObject],
                annotation: '',
                deleted: false,
                outOfDate: false,
                createdTimestamp: createdTimestamp,
                authorId: user?.uid,
                gitRepo: gitInfo[projectName]?.repo
                    ? gitInfo[projectName]?.repo
                    : '',
                gitBranch: gitInfo[projectName]?.branch
                    ? gitInfo[projectName]?.branch
                    : '',
                gitCommit: gitInfo[projectName]?.commit
                    ? gitInfo[projectName]?.commit
                    : 'localChange',
                projectName: projectName,
                githubUsername: gitInfo.author,
                replies: [],
                outputs: [],
                codeSnapshots: [],
                sharedWith: 'private',
                selected: false,
                needToUpdate: true,
                lastEditTime: createdTimestamp,
            }
            setTempAnno(utils.buildAnnotation(temp))
            view?.createNewAnno(html, annotationList)
        })
}

// Allow user to create file-level annotation
export const createFileAnnotation = async (
    context: vscode.Uri
): Promise<void> => {
    if (!view) {
        await vscode.commands.executeCommand('adamite.launch')
    } else if (!view?._panel?.visible) {
        view?._panel?.reveal(vscode.ViewColumn.Beside)
    }
    const newAnnoId: string = uuidv4()
    const projectName: string = utils.getProjectName(context.fsPath)
    const programmingLang: string = context.toString().split('.')[
        context.toString().split('.').length - 1
    ]
    const visiblePath: string = vscode.workspace.workspaceFolders
        ? utils.getVisiblePath(projectName, context.fsPath)
        : context.fsPath
    const createdTimestamp = new Date().getTime()
    const anchorObject: AnchorObject = {
        anchor: { startLine: 0, endLine: 0, startOffset: 0, endOffset: 0 },
        anchorText: visiblePath,
        html: visiblePath,
        filename: context.toString(),
        gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
        stableGitUrl: utils.getGithubUrl(visiblePath, projectName, true),
        gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : '',
        gitBranch: gitInfo[projectName]?.branch
            ? gitInfo[projectName]?.branch
            : '',
        gitCommit: gitInfo[projectName]?.commit
            ? gitInfo[projectName]?.commit
            : 'localChange',
        anchorPreview: visiblePath,
        visiblePath,
        anchorId: uuidv4(),
        originalCode: visiblePath,
        parentId: newAnnoId,
        programmingLang,
        anchored: true,
        createdTimestamp,
        priorVersions: [],
        path: [],
        surroundingCode: {
            linesBefore: [],
            linesAfter: [],
        },
        potentialReanchorSpots: [],
    }
    const temp = {
        id: newAnnoId,
        anchors: [anchorObject],
        annotation: '',
        deleted: false,
        outOfDate: false,
        createdTimestamp,
        authorId: user?.uid,
        gitRepo: gitInfo[projectName]?.repo ? gitInfo[projectName]?.repo : '',
        gitBranch: gitInfo[projectName]?.branch
            ? gitInfo[projectName]?.branch
            : '',
        gitCommit: gitInfo[projectName]?.commit
            ? gitInfo[projectName]?.commit
            : 'localChange',
        projectName: projectName,
        githubUsername: gitInfo.author,
        replies: [],
        outputs: [],
        codeSnapshots: [],
        sharedWith: 'private',
        selected: false,
        needToUpdate: true,
        lastEditTime: createdTimestamp,
    }
    setTempAnno(utils.buildAnnotation(temp))
    view?.createNewAnno(visiblePath, annotationList)
}

// create highlight annotation
export const addNewHighlight = (
    selected?: boolean
): string | Promise<string> => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor) {
        vscode.window.showInformationMessage('No text editor is open!')
        return ''
    }

    if (!view) {
        vscode.commands.executeCommand('adamite.launch')
    } else if (!view?._panel?.visible) {
        view?._panel?.reveal(vscode.ViewColumn.Beside)
    }
    const text = activeTextEditor.document.getText(activeTextEditor.selection)
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(text)) {
        vscode.window.showInformationMessage('Cannot annotate full script tag!')
        return ''
    }
    const r = new vscode.Range(
        activeTextEditor.selection.start,
        activeTextEditor.selection.end
    )
    const projectName: string = utils.getProjectName(
        activeTextEditor.document.uri.fsPath
    )
    // Get the branch and commit
    const newAnnoId: string = uuidv4()
    const programmingLang: string = activeTextEditor.document.uri
        .toString()
        .split('.')[
        activeTextEditor.document.uri.toString().split('.').length - 1
    ]
    const visiblePath: string = vscode.workspace.workspaceFolders
        ? utils.getVisiblePath(
              projectName,
              activeTextEditor.document.uri.fsPath
          )
        : activeTextEditor.document.uri.fsPath
    return utils
        .getShikiCodeHighlighting(
            activeTextEditor.document.uri.toString(),
            text
        )
        .then((html) => {
            const anchorId = uuidv4()
            const createdTimestamp = new Date().getTime()
            const anc = anchor.createAnchorFromRange(r)
            const surrounding = {
                linesBefore: anchor.getSurroundingLinesBeforeAnchor(
                    activeTextEditor.document,
                    r
                ),
                linesAfter: anchor.getSurroundingLinesAfterAnchor(
                    activeTextEditor.document,
                    r
                ),
            }
            const stableGitUrl = utils.getGithubUrl(
                visiblePath,
                projectName,
                true
            )
            const anchorObject: AnchorObject = {
                anchor: anc,
                anchorText: text,
                html,
                filename: activeTextEditor.document.uri.toString(),
                gitUrl: utils.getGithubUrl(visiblePath, projectName, false),
                stableGitUrl,
                gitRepo: gitInfo[projectName]?.repo
                    ? gitInfo[projectName]?.repo
                    : '',
                gitBranch: gitInfo[projectName]?.branch
                    ? gitInfo[projectName]?.branch
                    : '',
                gitCommit: gitInfo[projectName]?.commit
                    ? gitInfo[projectName]?.commit
                    : 'localChange',
                anchorPreview: utils.getFirstLineOfHtml(
                    html,
                    !text.includes('\n')
                ),
                visiblePath,
                anchorId: anchorId,
                originalCode: html,
                parentId: newAnnoId,
                programmingLang,
                anchored: true,
                createdTimestamp: createdTimestamp,
                priorVersions: [
                    {
                        id: anchorId,
                        createdTimestamp: createdTimestamp,
                        html: html,
                        anchorText: text,
                        commitHash: gitInfo[projectName]?.commit
                            ? gitInfo[projectName]?.commit
                            : 'localChange',
                        branchName: gitInfo[projectName]?.branch
                            ? gitInfo[projectName]?.branch
                            : '',
                        // startLine: anc.startLine,
                        // endLine: anc.endLine,
                        anchor: anc,
                        stableGitUrl,
                        path: visiblePath,
                        surroundingCode: surrounding,
                    },
                ],
                path: astHelper.generateCodeContextPath(
                    r,
                    activeTextEditor.document
                ),
                potentialReanchorSpots: [],
                surroundingCode: surrounding,
            }
            const temp = {
                id: newAnnoId,
                anchors: [anchorObject],
                annotation: '',
                deleted: false,
                outOfDate: false,
                createdTimestamp,
                authorId: user?.uid,
                gitRepo: gitInfo[projectName]?.repo
                    ? gitInfo[projectName]?.repo
                    : '',
                gitBranch: gitInfo[projectName]?.branch
                    ? gitInfo[projectName]?.branch
                    : '',
                gitCommit: gitInfo[projectName]?.commit
                    ? gitInfo[projectName]?.commit
                    : 'localChange',
                projectName: projectName,
                githubUsername: gitInfo.author,
                replies: [],
                outputs: [],
                codeSnapshots: [],
                sharedWith: 'private',
                selected: selected ? selected : false,
                needToUpdate: true,
                lastEditTime: createdTimestamp,
            }
            setAnnotationList(
                annotationList.concat([utils.buildAnnotation(temp)])
            )
            view?.updateDisplay(
                utils.removeOutOfDateAnnotations(annotationList)
            )
            anchor.addHighlightsToEditor(annotationList, activeTextEditor)
            return newAnnoId
        })
}

// create and pin an annotation immediately
export const addNewSelectedAnnotation = async (): Promise<void> => {
    const id: string = await addNewHighlight(true)
    if (id !== '')
        setSelectedAnnotationsNavigations([
            ...selectedAnnotationsNavigations,
            {
                id,
                anchorId: annotationList.find((a) => a.id === id)?.anchors[0]
                    .anchorId,
                lastVisited: false,
            },
        ])
}

// Code for flipping between each selected annotation and its location in the file system
export const navigateSelectedAnnotations = (direction: string): void => {
    let lastVisited: number = selectedAnnotationsNavigations.findIndex(
        (a) => a.lastVisited
    )
    if (lastVisited === -1) {
        const id: string = selectedAnnotationsNavigations[0].id
        const anchorId: string = selectedAnnotationsNavigations[0].anchorId
        viewHelper.handleScrollInEditor(id, anchorId)
        selectedAnnotationsNavigations[0].lastVisited = true
        return
    }
    const selectedAnno: Annotation | undefined = annotationList.find(
        (a) => a.id === selectedAnnotationsNavigations[lastVisited].id
    )

    const anchorIdx: number | undefined = selectedAnno?.anchors.findIndex(
        (a) =>
            a.anchorId === selectedAnnotationsNavigations[lastVisited].anchorId
    )
    if (selectedAnno && anchorIdx !== undefined && anchorIdx !== -1) {
        let newAnchorIdx: number =
            direction === 'forward'
                ? anchorIdx + 1 < selectedAnno.anchors.length
                    ? anchorIdx + 1
                    : -1
                : anchorIdx - 1 >= 0
                ? anchorIdx - 1
                : -2
        let id = '',
            anchorId = ''
        // switching to next annotation in list
        if (newAnchorIdx === -1 || newAnchorIdx === -2) {
            selectedAnnotationsNavigations[lastVisited].lastVisited = false
            lastVisited =
                newAnchorIdx === -1
                    ? lastVisited + 1 < selectedAnnotationsNavigations.length
                        ? lastVisited + 1
                        : 0
                    : lastVisited - 1 >= 0
                    ? lastVisited - 1
                    : selectedAnnotationsNavigations.length - 1
            id = selectedAnnotationsNavigations[lastVisited].id
            const newAnno: Annotation | undefined = annotationList.find(
                (a) => a.id === selectedAnnotationsNavigations[lastVisited].id
            )
            newAnchorIdx =
                newAnchorIdx === -1
                    ? 0
                    : newAnno
                    ? newAnno.anchors.length - 1
                    : 0
            selectedAnnotationsNavigations[lastVisited].lastVisited = true
            selectedAnnotationsNavigations[lastVisited].anchorId =
                newAnno?.anchors[newAnchorIdx].anchorId
            anchorId = selectedAnnotationsNavigations[lastVisited].anchorId
        }
        // staying within annotation
        else {
            id = selectedAnno.id
            anchorId = selectedAnno.anchors[newAnchorIdx].anchorId
            selectedAnnotationsNavigations[lastVisited].anchorId = anchorId
        }
        viewHelper.handleScrollInEditor(id, anchorId)
    }
}

// code that is run when user clicks on "show annotation" in hover over text
export const showAnnoInWebview = (id: string) => {
    if (view?._panel?.visible) {
        view?.scrollToAnnotation(id)
    } else {
        view?._panel?.reveal()
        view?.scrollToAnnotation(id)
    }
}

// captures metadata at time of copy to help recreate the annotation later when pasted
export const overriddenClipboardCopyAction = (
    textEditor: vscode.TextEditor,
    edit: vscode.TextEditorEdit,
    args: any[]
) => {
    const annotationsInEditor = utils.getAnnotationsInFile(
        annotationList,
        textEditor.document.uri.toString()
    )
    const anchorsInRange = anchor.getAnchorsInRange(
        textEditor.selection,
        annotationsInEditor
    )
    const copiedText = textEditor.document.getText(textEditor.selection)
    if (anchorsInRange.length) {
        const annoIds = anchorsInRange.map((a) => a.anchor.parentId)
        const { start } = textEditor.selection
        const annosWithCopyMetaData = anchorsInRange.map((a) => {
            return {
                anchor: a.anchor,
                anno: annotationList.filter((a) => annoIds.includes(a.id))[0],
                offsetInCopy: {
                    startLine:
                        a.range.start.line - start.line < 0
                            ? a.range.start.line
                            : a.range.start.line - start.line,
                    startOffset:
                        a.range.start.character - start.character < 0
                            ? a.range.start.character
                            : a.range.start.character - start.character,
                    endLine:
                        a.range.end.line - start.line < 0
                            ? a.range.end.line
                            : a.range.end.line - start.line,
                    endOffset: a.range.end.character,
                },
            }
        })
        setCopiedAnnotationList(annosWithCopyMetaData)
    } else if (copiedAnnotations.length) {
        setCopiedAnnotationList([]) // we no longer are copying annotations
    }

    vscode.env.clipboard.writeText(copiedText)
    setStoredCopyText(copiedText)
}

// Same as copy but for cut - captures metadata to recreate the annotation
export const overriddenClipboardCutAction = (
    textEditor: vscode.TextEditor,
    edit: vscode.TextEditorEdit,
    args: any[]
) => {
    const annotationsInEditor = utils.getAnnotationsInFile(
        annotationList,
        textEditor.document.uri.toString()
    )
    const anchorsInRange = anchor.getAnchorsInRange(
        textEditor.selection,
        annotationsInEditor
    )
    const copiedText = textEditor.document.getText(textEditor.selection)
    if (anchorsInRange.length) {
        const annoIds = anchorsInRange.map((a) => a.anchor.parentId)
        const remainingAnnos = annotationList.filter(
            (id) => !annoIds.includes(id)
        )
        const cutAnnos = annotationList.filter((id) => annoIds.includes(id))
        if (view) anchor.addHighlightsToEditor(remainingAnnos, textEditor) // why only when view???
        const { start } = textEditor.selection
        const annosWithCopyMetaData = anchorsInRange.map((a) => {
            return {
                anchor: a.anchor,
                anno: cutAnnos.filter((a) => annoIds.includes(a.id))[0],
                offsetInCopy: {
                    startLine:
                        a.range.start.line - start.line < 0
                            ? a.range.start.line
                            : a.range.start.line - start.line,
                    startOffset:
                        a.range.start.character - start.character < 0
                            ? a.range.start.character
                            : a.range.start.character - start.character,
                    endLine:
                        a.range.end.line - start.line < 0
                            ? a.range.end.line
                            : a.range.end.line - start.line,
                    endOffset: a.range.end.character,
                },
            }
        })
        setCopiedAnnotationList(annosWithCopyMetaData)
    } else if (copiedAnnotations.length) {
        setCopiedAnnotationList([]) // we no longer are copying annotations
    }
    vscode.env.clipboard.writeText(copiedText)
    edit.delete(textEditor.selection)
    setStoredCopyText(copiedText)
}

// NOT USING CURRENTLY
export const overriddenFindAction = (
    textEditor: vscode.TextEditor,
    edit: vscode.TextEditorEdit,
    args: any[]
) => {
    console.log('finding...', textEditor, args, edit)
    vscode.commands.executeCommand('editor.action.startFindReplaceAction')
    // vscode.commands.getCommands().then((value: string[]) => utils.writeConsoleLogToFile(value))
}

// NOT USING CURRENTLY
export const overridenRevealDefinitionAction = (
    textEditor: vscode.TextEditor,
    edit: vscode.TextEditorEdit,
    args: any[]
) => {
    console.log('this is what we are doing')
    vscode.commands.executeCommand('editor.action.showReferences')
}
