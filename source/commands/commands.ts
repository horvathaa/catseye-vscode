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
    catseyeLog,
    selectedAnnotationsNavigations,
    setSelectedAnnotationsNavigations,
    astHelper,
    setTempMergedAnchors,
    tempMergedAnchors,
    searchEvents,
    // trackedFiles,
    // setTrackedFiles,
} from '../extension'
import {
    AnchorObject,
    Annotation,
    GitDiffPathLog,
    HistoryAnchorObject,
    WebCopyData,
} from '../constants/constants'
import * as anchor from '../anchorFunctions/anchor'
import * as vscode from 'vscode'
import * as utils from '../utils/utils'
import ViewLoader from '../view/ViewLoader'
import * as viewHelper from '../viewHelper/viewHelper'
import { v4 as uuidv4 } from 'uuid'
import { initializeAuth } from '../authHelper/authHelper'
import {
    catseyeFoldingRangeProvider,
    refreshFoldingRanges,
} from '../foldingRangeProvider/foldingRangeProvider'
// import parseGitDiff from 'parse-git-diff'
import { parse } from 'diff2html'
import { formatTimestamp } from '../view/app/utils/viewUtils'
// import { DefaultLogFields, ListLogLine } from 'simple-git'
// import { GitDiff } from 'parse-git-diff/build/types'

// import { computeMostSimilarAnchor } from '../anchorFunctions/reanchor'

// on launch, create auth session and sign in to FireStore
export const init = async () => {
    catseyeLog.appendLine('Calling init')
    await initializeAuth()
    trackAndAuditFilesOnLaunch()
    if (view) {
        view._panel?.reveal()
    }
}

export const trackAndAuditFilesOnLaunch = (): void => {
    const docs = vscode.window.visibleTextEditors.map((t) => t.document)
    docs.forEach((document: vscode.TextDocument) => {
        utils.addFileToTrack(document)
    })
}

// Creates catseye side panel and sets up its listeners
export const createView = async (context: vscode.ExtensionContext) => {
    if (vscode.workspace.workspaceFolders) {
        if (view) {
            catseyeLog.appendLine('Revealing catseye panel.')
            view._panel?.reveal()
            return
        }
        catseyeLog.appendLine('Creating new panel')
        const newView: ViewLoader = new ViewLoader(
            vscode.workspace.workspaceFolders[0].uri,
            context.extensionPath
        )
        setView(newView)
        let foldingRangeProviderDisposable =
            vscode.languages.registerFoldingRangeProvider(
                '*',
                catseyeFoldingRangeProvider
            )
        context.subscriptions.push(foldingRangeProviderDisposable)
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
                    case 'scrollToRange': {
                        const { anchor, filename, gitUrl } = message
                        viewHelper.handleScrollToRange(anchor, filename, gitUrl)
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
                        break
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
                    case 'removeTempMergeAnchor': {
                        const { anchorsToRemove } = message
                        viewHelper.handleRemoveTempMergeAnchor(anchorsToRemove)
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
                    case 'reanchor': {
                        const { annoId, newAnchor } = message
                        console.log('reanchoring')
                        viewHelper.handleReanchor(annoId, newAnchor)
                        break
                    }
                    case 'manualReanchor': {
                        const { annoId, oldAnchor } = message
                        viewHelper.handleManualReanchor(oldAnchor, annoId)
                        break
                    }
                    case 'showResolvedUpdated': {
                        const { showResolved } = message
                        viewHelper.handleShowResolvedUpdated(showResolved)
                        break
                    }
                    case 'requestOpenDocumentation': {
                        viewHelper.handleOpenDocumentation()
                        break
                    }
                    case 'requestOpenBugReportForm': {
                        viewHelper.handleOpenBugReportForm()
                        break
                    }
                    default: {
                        break
                    }
                }
            })

            // since we launched catseye, show highlights in editor
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
                    foldingRangeProviderDisposable.dispose()
                    refreshFoldingRanges()
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

// user has expressed they want to annotate something - get catseye side panel init'ed for that operation
export const createNewAnnotation = async () => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor) {
        vscode.window.showInformationMessage('No text editor is open!')
        return
    }
    if (!view) {
        await vscode.commands.executeCommand('catseye.launch')
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
            const createdTimestamp = new Date().getTime()
            const projectName: string = utils.getProjectName(
                activeTextEditor.document.uri.fsPath
            )
            const anchorObject = utils.createBasicAnchorObject(
                activeTextEditor,
                r,
                newAnnoId,
                createdTimestamp,
                projectName
            )

            setTempMergedAnchors(anchorObject)
            anchor.addTempAnnotationHighlight(
                tempMergedAnchors,
                activeTextEditor
            )
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
            view?.createNewAnno(newAnnoId, anchorObject, annotationList)
        })
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
        vscode.commands.executeCommand('catseye.launch')
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

    // Get the branch and commit
    const newAnnoId: string = uuidv4()
    return utils
        .getShikiCodeHighlighting(
            activeTextEditor.document.uri.toString(),
            text
        )
        .then((html) => {
            const createdTimestamp = new Date().getTime()
            const projectName: string = utils.getProjectName(
                activeTextEditor.document.uri.fsPath
            )
            const anchorObject = utils.createBasicAnchorObject(
                activeTextEditor,
                r,
                newAnnoId,
                createdTimestamp,
                projectName
            )
            const temp = utils.createBasicAnnotation(
                anchorObject,
                createdTimestamp,
                newAnnoId,
                projectName,
                selected
            )
            // console.log('made this highlight', temp)
            setAnnotationList(annotationList.concat([temp]))
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
        console.log('hewwo?', annosWithCopyMetaData)
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
    // const annotationsInEditor = utils.getAnnotationsInFile(
    //     annotationList,
    //     textEditor.document.uri.toString()
    // )
    const annotationsInEditor = utils.getAnnotationsWithStableGitUrl(
        annotationList,
        utils.getStableGitHubUrl(textEditor.document.uri.fsPath)
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
        const cutAnnos = annotationsInEditor.filter((a) =>
            annoIds.includes(a.id)
        )

        if (view) anchor.addHighlightsToEditor(remainingAnnos, textEditor) // why only when view???
        const { start } = textEditor.selection
        const annosWithCopyMetaData = anchorsInRange.map((a) => {
            return {
                anchor: a.anchor,
                anno: cutAnnos.filter((a) => annoIds.includes(a.id))[0], // stupid
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

export const createHistoryAnnotation = async () => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor) {
        vscode.window.showInformationMessage('No text editor is open!')
        return
    }
    if (!view) {
        await vscode.commands.executeCommand('catseye.launch')
    } else if (!view?._panel?.visible) {
        view?._panel?.reveal(vscode.ViewColumn.Beside)
    }

    // console.log('selection', activeTextEditor.selection)
    // const text = activeTextEditor.document.getText(activeTextEditor.selection)
    const file = activeTextEditor.document.uri.fsPath
    const projectName = utils.getProjectName(
        activeTextEditor.document.uri.toString()
    )
    const visiblePath = utils.getVisiblePath(
        projectName,
        activeTextEditor.document.uri.fsPath
    )
    // const relativePath = `./${visiblePath}`.replace(/\\/g, '/')
    // console.log('hewwo???', relativePath)
    // console.log('utils.git', utils.git)
    const line = activeTextEditor.selection.start.line + 1
    const rawOptions = ['log', '-C', `-L${line},+1:${file}`]
    const regOpts = [`-L${line},+1:${file}`]
    // console.log('rawOptions', rawOptions)
    try {
        const result = await utils.git.raw(rawOptions)
        // console.log('result?', result)
        const resRawSplit = result
            .split('diff')
            .filter((s) => s.includes('--git'))
            .map((s) => 'diff' + s)
        // .filter((s) => s.includes('diff'))
        // console.log('lol', resRawSplit)
        const regResult = await utils.git.log(regOpts)
        const outputs: GitDiffPathLog[] = regResult.all.map((log, i) => {
            // console.log('hewwo?', parse(resRawSplit[i]))
            // outputs.push(
            return {
                simpleGit: log,
                gitDiff: parse(resRawSplit[i]),
            }
            // )
        })
        // console.log('wowie!', outputs)
        // console.log('regresult', regResult)
        const newAnnoId = uuidv4()
        const createdTimestamp = new Date().getTime()
        // const anc = anchor.createAnchorFromRange(activeTextEditor.selection)
        // const createdTimestamp = new Date().getTime()
        const projectName: string = utils.getProjectName(
            activeTextEditor.document.uri.fsPath
        )
        const anchorObject = utils.createBasicAnchorObject(
            activeTextEditor,
            activeTextEditor.selection,
            newAnnoId,
            createdTimestamp,
            projectName,
            outputs
        )
        const temp = utils.createBasicAnnotation(
            anchorObject,
            createdTimestamp,
            newAnnoId,
            projectName
        )
        setAnnotationList(annotationList.concat([utils.buildAnnotation(temp)]))
        view?.updateDisplay(utils.removeOutOfDateAnnotations(annotationList))
        anchor.addHighlightsToEditor(annotationList, activeTextEditor)
    } catch (error) {
        console.error('whyyy', error)
    }
}

export const overriddenClipboardPasteAction = async (
    textEditor: vscode.TextEditor,
    edit: vscode.TextEditorEdit,
    args: any[]
) => {
    console.log('hewwo???', textEditor, edit, args)
    const str = await vscode.env.clipboard.readText()
    console.log('searchEvents')

    const startPosition: vscode.Position = textEditor.selection.start
    const wsEdit = new vscode.WorkspaceEdit()
    wsEdit.replace(
        textEditor.document.uri,
        // getRangeOfSubstring(rawText, versionText),
        textEditor.selection,
        str
    )
    const applyEditBool = await vscode.workspace.applyEdit(wsEdit)
    if (!applyEditBool) {
        console.error('Could not paste')
    }
    if (searchEvents && searchEvents.length) {
        console.log('searchEvents??', searchEvents)
        let copyMatch: WebCopyData | undefined = undefined
        let urlMatch: string = ''
        const match = searchEvents.find((s) => {
            for (let key of Object.keys(s.copyData)) {
                if (s.copyData[key].includes(str)) {
                    copyMatch = s.copyData
                    urlMatch = key
                    return true
                }
            }
        })
        if (match && copyMatch && urlMatch.length) {
            console.log('hewwo!!!!!!!', match)
            const annoId = uuidv4()
            const time = new Date().getTime()
            const info = utils.buildAnnotation({
                ...utils.createBasicAnnotation(
                    utils.createBasicAnchorObject(
                        textEditor,
                        new vscode.Range(
                            startPosition,
                            textEditor.selection.start
                        ),
                        annoId,
                        time
                    ),
                    time,
                    annoId
                ),
                annotation: `Copied from ${urlMatch} while searching ${match.search
                    .map((s) => s.search)
                    .join(', ')} on ${formatTimestamp(match.startTime)}`,
                replies: [
                    {
                        authorId: user?.uid ?? '',
                        createdTimestamp: time,
                        deleted: false,
                        githubUsername: gitInfo.username,
                        id: uuidv4(),
                        lastEditTime: time,
                        replyContent: `Other programming-related sites visited during this session: ${[
                            ...new Set(match.urls),
                        ].join(', \n')}`,
                    },
                    {
                        authorId: user?.uid ?? '',
                        createdTimestamp: time,
                        deleted: false,
                        githubUsername: gitInfo.username,
                        id: uuidv4(),
                        lastEditTime: time,
                        replyContent: `Other programming-related copies created during this session: ${prettyPrintCopyData(
                            match.copyData
                        )}`,
                    },
                ],
            })
            setAnnotationList(annotationList.concat(info))
            if (view) {
                view.updateDisplay(annotationList)
                anchor.addHighlightsToEditor(annotationList, textEditor)
            }
        }
    }

    // const saveBool = await packageJsonDocument.save();
    // textEditor.edit(edit)
}

const prettyPrintCopyData = (copyData: WebCopyData): string => {
    let str = ''
    for (let key in copyData) {
        str = str.concat(
            `At ${key}, copied: ${[...new Set(copyData[key])].join(', ')}`
        )
    }
    return str
}
