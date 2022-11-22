/*
 *
 * listeners.ts
 * Callback functions for various VS Code events
 *
 */

import * as vscode from 'vscode'
import {
    annotationList,
    copiedAnnotations,
    tempAnno,
    setTempAnno,
    setTabSize,
    user,
    view,
    setActiveEditor,
    setAnnotationList,
    deletedAnnotations,
    setDeletedAnnotationList,
    setInsertSpaces,
    // changes,
    // setChangeEvents,
    // incrementNumChangeEventsCompleted,
    // numChangeEventsCompleted,
    setCurrentColorTheme,
    gitInfo,
    currentGitHubProject,
    gitApi,
    // tsFiles,
    // setTsFiles,
    floatingDecorations,
    astHelper,
    setEventsToTransmitOnSave,
    eventsToTransmitOnSave,
} from '../extension'
import * as anchor from '../anchorFunctions/anchor'
import {
    computeMostSimilarAnchor,
    REANCHOR_DEBUG,
} from '../anchorFunctions/reanchor'
import * as utils from '../utils/utils'
import {
    Annotation,
    AnchorObject,
    // ChangeEvent,
    // PotentialAnchorObject,
    EventType,
    CatseyeCommentCharacter,
    // AnnotationAnchorTextPair,
    // Timer
} from '../constants/constants'
import { createEvent } from '../utils/utils'
import { emitEvent } from '../firebase/functions/functions'
import * as ts from 'typescript'
import { getCodeLine } from '../anchorFunctions/reanchor'
import { CommentConfigHandler } from '../commentConfigHandler/commentConfigHandler'
import { convertCodeCommentToAnnotation } from '../commands/commands'

// let timeSinceLastEdit: number = -1
// let tempChanges: any[] = []
// Update our internal representation of the color theme so Shiki (our package for code formatting) uses appropriate colors
export const handleDidChangeActiveColorTheme = (
    colorTheme: vscode.ColorTheme
) => {
    // give editor time to update...
    setTimeout(() => {
        setCurrentColorTheme(
            vscode.workspace.getConfiguration(
                'workbench',
                vscode.workspace.workspaceFolders &&
                    vscode.workspace.workspaceFolders[0].uri
            ).colorTheme
        )
        view?.sendNewColorTheme(vscode.window.activeColorTheme)
    }, 3000)
}

// Listens for a change in visible editors so we can highlight correct anchors for all visible files
export const handleChangeVisibleTextEditors = (
    textEditors: readonly vscode.TextEditor[]
) => {
    // const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
    const textEditorProjectFileNames = textEditors.map((t) =>
        utils.getStableGitHubUrl(t.document.uri.fsPath)
    )
    const annotationsToHighlight = annotationList.filter((a) => {
        // const filenames = utils.getAllAnnotationFilenames([a]);
        const gitUrls = utils.getAllAnnotationStableGitUrls([a])
        return textEditorProjectFileNames.some((t) => gitUrls.includes(t))
    })

    if (!annotationsToHighlight.length) return

    if (view) {
        textEditors.forEach((t) => {
            anchor.addHighlightsToEditor(annotationsToHighlight, t)
            const shouldWatchFile =
                !astHelper.checkIsSourceFileIsWatched(t.document) &&
                astHelper.isTsJsJsxTsx(t.document)
            shouldWatchFile && astHelper.addSourceFile(t.document)
        })
    }
}

// update catseye pane such that annotations are in the correct project and file lists
export const handleChangeActiveTextEditor = (
    TextEditor: vscode.TextEditor | undefined
) => {
    if (vscode.workspace.workspaceFolders) {
        if (TextEditor) {
            const codeLines = getCodeLine(TextEditor.document.getText())
            // const tokenized = ts.createSourceFile(
            //     TextEditor.document.fileName,
            //     TextEditor.document.getText(),
            //     ts.ScriptTarget.Latest
            // )

            const commentConfigHandler = new CommentConfigHandler()
            // console.log(
            //     'handler',
            //     commentConfigHandler,
            //     'wtf',
            //     TextEditor.document.languageId
            // )
            const commentCfg = commentConfigHandler.getCommentConfig(
                TextEditor.document.languageId
            )
            // console.log('commentCfg', commentCfg)

            function escapeRegex(string: string) {
                return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            }

            const commentLineDelimiter = commentCfg?.lineComment
            // console.log('commentLineDelimeter', commentLineDelimiter)

            const regex = new RegExp(
                `\s*${escapeRegex(commentLineDelimiter ?? '//')}.*`,
                'ig'
            )
            const blockRegexOpen = new RegExp(
                `\s*${escapeRegex(
                    commentCfg && commentCfg.blockComment
                        ? commentCfg.blockComment[0]
                        : '/*'
                )}.*`,
                'ig'
            )

            const blockRegexClose = new RegExp(
                `\s*${escapeRegex(
                    commentCfg && commentCfg.blockComment
                        ? commentCfg.blockComment[1]
                        : '*/'
                )}.*`,
                'ig'
            )
            const comments: any[] = []
            const blockCommentQueue: any[] = []
            codeLines.forEach((l) => {
                const lineText = l.code.map((c) => c.token).join(' ')
                // console.log('lineText', lineText)
                const isLineComment = regex.test(lineText)
                // ||
                // blockRegexOpen.test(lineText) ||
                // blockRegexClose.test(lineText)

                if (isLineComment) {
                    const type =
                        l.code[0].token === commentCfg?.lineComment
                            ? 'wholeLine'
                            : 'trailing'
                    l.code.find((c) => c.token === commentCfg?.lineComment) &&
                        comments.push({ ...l, type, text: lineText })
                } else if (blockRegexOpen.test(lineText)) {
                    blockCommentQueue.push({
                        ...l,
                        type: 'blockComment',
                        startLine: l.line,
                        text: lineText,
                    })
                } else if (blockRegexClose.test(lineText)) {
                    if (blockCommentQueue.length) {
                        const newComment = {
                            ...blockCommentQueue.pop(),
                            endLine: l.line,
                            text: lineText,
                        }
                        comments.push(newComment)
                    }
                }

                // console.log(
                //     `wtf -- ${
                //         isLineComment
                //             ? 'this is a comment'
                //             : 'this is NOT a comment'
                //     }`,
                //     'line',
                //     l
                // )
            })
            // console.log('comments', comments)

            // console.log('codeLines', codeLines, 'tokenized', tokenized)
            if (TextEditor.options?.tabSize)
                setTabSize(TextEditor.options.tabSize)
            if (TextEditor.options?.insertSpaces)
                setInsertSpaces(TextEditor.options.insertSpaces)
            // setAnnotationList(utils.sortAnnotationsByLocation(annotationList))

            const currentProject: string = utils.getProjectName(
                TextEditor.document.uri.fsPath
            )
            const gitUrl: string = utils.getGithubUrl(
                TextEditor.document.uri.fsPath,
                currentProject,
                true
            )
            if (
                gitInfo[currentProject] &&
                currentGitHubProject !== gitInfo[currentProject].repo
            ) {
                utils.updateCurrentGitHubProject(gitApi)
                utils.updateCurrentGitHubCommit(gitApi)
            }

            astHelper.addSourceFile(TextEditor.document)
            // console.log('ADD FILE TO TRACK IN ACTIVE TEXT EDITOR')
            utils.addFileToTrack(TextEditor.document)
            if (user && vscode.workspace.workspaceFolders)
                view?.updateDisplay(undefined, gitUrl, currentProject)
        }
    }
    setActiveEditor(TextEditor)
}

const updateAnnotationsAnchorsOnSave = (
    document: vscode.TextDocument
): Annotation[] => {
    const gitUrl = utils.getStableGitHubUrl(document.uri.fsPath)
    const anchors = anchor.getAnchorsWithGitUrl(gitUrl)

    let initialAnnotations = utils.getAnnotationsWithStableGitUrl(
        annotationList,
        gitUrl
    )

    if (REANCHOR_DEBUG) {
        const newAnchors = anchors.map((a) =>
            computeMostSimilarAnchor(document, a)
        )
        initialAnnotations = utils.updateAnnotationsWithAnchors(newAnchors)
        console.log('initial annotations after update', initialAnnotations)
    }

    const annosWithNewSurroundingContext: Annotation[] =
        utils.updateAnnotationsWithAnchors(
            anchors.map((a): AnchorObject => {
                return !a.readOnly
                    ? {
                          ...a,
                          surroundingCode: anchor.getSurroundingCodeArea(
                              document,
                              a
                          ),
                      }
                    : a
            })
        )

    return annosWithNewSurroundingContext.map((a) =>
        a.anchors.every((anch) => !anch.readOnly)
            ? astHelper.buildPathForAnnotation(a, document)
            : a
    )
}

// In case where user saves or closes a window, save annotations to FireStore
export const handleDidSaveDidClose = (TextDocument: vscode.TextDocument) => {
    const gitUrl = utils.getStableGitHubUrl(TextDocument.uri.fsPath)
    const updatedAnnotations: Annotation[] =
        updateAnnotationsAnchorsOnSave(TextDocument)

    setAnnotationList(
        utils.removeOutOfDateAnnotations(
            updatedAnnotations.concat(
                utils.getAnnotationsNotWithGitUrl(annotationList, gitUrl)
            )
        )
    )
    emitEvent(eventsToTransmitOnSave)
    view?.updateDisplay(annotationList, gitUrl)
    if (vscode.workspace.workspaceFolders)
        utils.handleSaveCloseEvent(
            annotationList,
            vscode.workspace.workspaceFolders[0].uri.path + '/test.json',
            gitUrl,
            TextDocument
        )
}

const compareAnnotationAnchorTextPairs = (
    oldSet: Map<string, string>,
    newSet: Map<string, string>
): string[] => {
    const ids: string[] = []
    oldSet.forEach((anchorText: string, key: string) => {
        // console.log('hewwo?', newSet.get(key), 'anch', anchorText)
        const split = key.split('%')
        if (anchorText !== newSet.get(key)) ids.push(split[1])
    })
    return ids
}

const createAnnotationAnchorTextPairs = (
    annotationList: Annotation[]
): Map<string, string> => {
    const map = new Map()
    annotationList.forEach((a) => {
        a.anchors.forEach((anch) =>
            map.set(`${anch.anchorId}%${anch.parentId}`, anch.anchorText)
        )
    })
    return map
}

// When user edits a document, update corresponding annotations
export const handleDidChangeTextDocument = (
    e: vscode.TextDocumentChangeEvent
) => {
    // logChanges(e);

    if (e.document.fileName.includes('extension-output-')) return // this listener also gets triggered when the output pane updates???? for some reason????
    const stableGitPath = utils.getStableGitHubUrl(e.document.uri.fsPath)

    if (e.contentChanges.find((c) => c.text.includes('\n'))) {
        convertCodeCommentToAnnotation({ triggeredByCommand: false }, e)
    }

    // const currentAnnotations = utils.getAllAnnotationsWithAnchorInFile(annotationList, e.document.uri.toString());
    let currentAnnotations = utils.getAllAnnotationsWithGitUrlInFile(
        annotationList,
        stableGitPath
    )
    // .filter((a) => a.anchors.every((an) => !an.readOnly))
    const currReadOnlyAnnotations = currentAnnotations.filter((a) =>
        a.anchors.some((anch) => anch.readOnly)
    )
    if (currReadOnlyAnnotations.length) {
        currentAnnotations = currentAnnotations.filter((a) =>
            a.anchors.some((an) => !an.readOnly)
        )
    }
    const couldBeUndoOrPaste =
        utils.getAllAnnotationsWithGitUrlInFile(
            deletedAnnotations,
            stableGitPath
        ).length > 0 || copiedAnnotations.length > 0
    if (!currentAnnotations.length && !tempAnno && !couldBeUndoOrPaste) {
        return
    } // no annotations could possibly be affected by this change
    else {
        let translatedAnnotations: Annotation[] = currentAnnotations
        let rangeAdjustedAnnotations: Annotation[] = []
        for (const change of e.contentChanges) {
            const startLine = change.range.start.line
            const endLine = change.range.end.line
            const linesInRange = endLine - startLine
            const linesInserted = change.text.split('\n').length - 1
            const diff = linesInserted - linesInRange

            // check to see if user pasted a copied or previously-deleted annotation...
            if (
                utils.didUserPaste(change.text) &&
                copiedAnnotations.length &&
                change.text.length
            ) {
                // make sure this isn't a cut w/o paste
                if (vscode.workspace.workspaceFolders) {
                    rangeAdjustedAnnotations = utils.reconstructAnnotations(
                        copiedAnnotations,
                        change.text,
                        change.range,
                        e.document.uri,
                        vscode.workspace.workspaceFolders[0].uri,
                        e.document
                    )
                }
            }
            // check to see if there's any deleted annotations that may be brought back
            else if (deletedAnnotations.length) {
                const deletedAnnos = utils.checkIfChangeIncludesAnchor(
                    deletedAnnotations,
                    change.text
                )
                const currAnnoIds: string[] = currentAnnotations.map(
                    (a) => a.id
                )
                if (deletedAnnos.length && vscode.workspace.workspaceFolders) {
                    deletedAnnos.forEach((a: Annotation) => {
                        a.deleted = false
                        a.outOfDate = false
                    })
                    rangeAdjustedAnnotations = deletedAnnos
                    const deletedIds = deletedAnnos.map((a) => a.id)
                    // delete event emit here
                    setDeletedAnnotationList(
                        deletedAnnotations.filter(
                            (a: Annotation) => !deletedIds?.includes(a.id)
                        )
                    ) // undo stack has been popped
                }
                // probably did a cut paste which brought the anno back -- refresh list
                else if (
                    deletedAnnotations.filter((a) => currAnnoIds.includes(a.id))
                        .length
                ) {
                    setDeletedAnnotationList(
                        deletedAnnotations.filter(
                            (a) => !currAnnoIds.includes(a.id)
                        )
                    )
                }
            }

            const pairsBeforeTranslate = createAnnotationAnchorTextPairs(
                translatedAnnotations
            )

            // console.log('pairsBeforeTranslate', pairsBeforeTranslate)

            // update and remove any annotation given the translate change handler in anchor.ts
            // mark any annotation that has changed for saving to FireStore
            translatedAnnotations = translatedAnnotations.map(
                (a: Annotation) => {
                    return anchor.handleUpdatingTranslatedAnnotations(
                        a,
                        stableGitPath,
                        change,
                        diff,
                        e
                    )
                }
            )

            const pairsAfterTranslate = createAnnotationAnchorTextPairs(
                translatedAnnotations
            )

            // console.log('pairs after', pairsAfterTranslate)

            const idsWithChangedText = compareAnnotationAnchorTextPairs(
                pairsBeforeTranslate,
                pairsAfterTranslate
            )
            // console.log('ids', idsWithChangedText)
            if (idsWithChangedText.length) {
                setEventsToTransmitOnSave(
                    translatedAnnotations
                        .filter((a) => idsWithChangedText.includes(a.id))
                        .map((a) => createEvent([a], EventType.textChange))
                )
            }

            // if user is creating an annotation at edit time, update that annotation too
            if (
                tempAnno &&
                tempAnno.anchors[0].stableGitUrl === stableGitPath
            ) {
                const newAnchor = anchor.translateChanges(
                    tempAnno.anchors[0],
                    change.range,
                    change.text.length,
                    diff,
                    change.rangeLength,
                    e.document,
                    change.text
                )
                if (newAnchor)
                    setTempAnno({ ...tempAnno, anchors: [newAnchor] })
            }
        }
        let shouldRefreshDisplay: boolean = translatedAnnotations.some(
            (a) => a.needToUpdate
        )

        const notUpdatedAnnotations: Annotation[] = utils
            .getAnnotationsNotWithGitUrl(annotationList, stableGitPath)
            .concat(currReadOnlyAnnotations)
        const newAnnotationList: Annotation[] = translatedAnnotations.concat(
            notUpdatedAnnotations,
            rangeAdjustedAnnotations
        )

        // highlight changed annotations
        if (vscode.window.activeTextEditor && view) {
            anchor.addHighlightsToEditor(
                newAnnotationList,
                vscode.window.activeTextEditor
            )
            shouldRefreshDisplay &&
                view.updateDisplay(
                    newAnnotationList,
                    utils.getStableGitHubUrl(e.document.uri.fsPath)
                )
        } else {
            setAnnotationList(
                //utils.sortAnnotationsByLocation(
                annotationList // why just annotationList and not newAnnotationList???
                //    )
            )
        }
    }
}

export const handleDidChangeTextEditorSelection = async (
    e: vscode.TextEditorSelectionChangeEvent
): Promise<void> => {
    const { selections, textEditor } = e
    const activeSelection = selections[0]
    if (!activeSelection.start.isEqual(activeSelection.end)) {
        let createAnnotationWebviewLink: vscode.MarkdownString =
            new vscode.MarkdownString()
        createAnnotationWebviewLink.isTrusted = true
        const create = vscode.Uri.parse(`command:catseye.addAnnotation`)
        createAnnotationWebviewLink.appendMarkdown(
            `[Create Annotation](${create})`
        )
        const decOpts: vscode.DecorationOptions[] = [
            {
                range: activeSelection,
                hoverMessage: createAnnotationWebviewLink,
            },
        ]
        textEditor.setDecorations(floatingDecorations, decOpts)
    } else {
        textEditor.setDecorations(floatingDecorations, [])
    }

    return
}

// export const handleDidOpenTextDocument = (e: vscode.TextDocument): void => {
//     console.log('hewwo???', e)
// }

// const logChanges = (e: vscode.TextDocumentChangeEvent): void => {
//     let currentTime = new Date().getTime()
//     const projectName: string = utils.getProjectName(e.document.uri.toString())
//     if (timeSinceLastEdit === -1 || currentTime - timeSinceLastEdit <= 2000) {
//         timeSinceLastEdit = currentTime
//         tempChanges.push({
//             text: e.contentChanges
//                 .map((c) =>
//                     c.text !== ''
//                         ? c.text
//                         : `Delete: removed ${c.rangeLength} characters`
//                 )
//                 .join(' '),
//             file: e.document.fileName,
//             lines: e.contentChanges
//                 .map((c) =>
//                     c.range.start.line !== c.range.end.line
//                         ? c.range.start.line + ' to ' + c.range.end.line
//                         : `${c.range.start.line}`
//                 )
//                 .join(' '),
//             characterChanges: e.contentChanges.flatMap((c) => {
//                 return { added: c.text.length, removed: c.rangeLength }
//             }),
//         })
//     } else if (currentTime - timeSinceLastEdit >= 2000) {
//         timeSinceLastEdit = -1
//         const characterData = tempChanges.flatMap((a) => a.characterChanges)
//         setChangeEvents([
//             ...changes,
//             {
//                 time: currentTime,
//                 textAdded: tempChanges.map((t) => t.text).join(''),
//                 commit: gitInfo[projectName].commit,
//                 branch: gitInfo[projectName].branch,
//                 file: [...new Set(tempChanges.map((t) => t.file))].join('; '),
//                 line: [...new Set(tempChanges.map((t) => t.lines))].join('; '),
//                 charactersAdded: characterData.reduce(
//                     (accumulator, t) => accumulator + t.added,
//                     0
//                 ),
//                 charactersRemoved: characterData.reduce(
//                     (accumulator, t) => accumulator + t.removed,
//                     0
//                 ),
//             },
//         ])
//         tempChanges = []
//     }
// }
