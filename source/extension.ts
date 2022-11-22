/*
 *
 * extension.ts
 * The "main" file of the extension
 * Where all global variables are created and initialized and where all of the extension contribution points are defined.
 *
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
// import { Octokit, App } from 'octokit'
import firebase from './firebase/firebase'
import {
    AnchorObject,
    Annotation,
    AnnotationEvent,
    BrowserOutput,
    ChangeEvent,
    TsFile,
    WebSearchEvent,
} from './constants/constants'
import * as commands from './commands/commands'
import * as eventHandlers from './listeners/listeners'
import * as utils from './utils/utils'
import * as debug from './debug/debug'
import ViewLoader from './view/ViewLoader'
import { AstHelper } from './astHelper/astHelper'
import { partition } from './utils/utils'
import { saveAnnotations } from './firebase/functions/functions'
import { HoverController } from './hovers/hoverController'
import { addHighlightsToEditor } from './anchorFunctions/anchor'
import { ConvertCommentHoverController } from './hovers/convertCommentHoverController'
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports
export const gitApi = gitExtension?.getAPI(1)
console.log('gitApi', gitApi)
const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname).includes('\\')
        ? path.resolve(__dirname, '..\\.env.local')
        : path.resolve(__dirname, '../.env.local'),
})
export const ghApi = {
    auth: process.env.GH_AUTH,
}
export let gitInfo: { [key: string]: any } = {}
export let annotationList: Annotation[] = []
export let copiedAnnotations: { [key: string]: any }[] = []
export let deletedAnnotations: Annotation[] = []
export let outOfDateAnnotations: Annotation[] = []
export let selectedAnnotationsNavigations: { [key: string]: any }[] = []
export let storedCopyText: string = ''
export let tabSize: number | string = 4
export let insertSpaces: boolean | string = true // not sure what to have as default here... VS Code API doesn't say what the default is lol
export let view: ViewLoader | undefined = undefined
export let user: firebase.User | null = null
export let tempAnno: Annotation | null = null
export let activeEditor = vscode.window.activeTextEditor
export let currentColorTheme: string = vscode.workspace.getConfiguration(
    'workbench',
    vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders[0].uri
).colorTheme
export let catseyeLog = vscode.window.createOutputChannel('Catseye')
export let currentGitHubProject: string = '' // also need to add call to update this when user switches projects
export let currentGitHubCommit: string = ''
export let changes: ChangeEvent[] = []
export let numChangeEventsCompleted = 0
export let tsFiles: TsFile[] = []
export let trackedFiles: vscode.TextDocument[] = []
export let astHelper: AstHelper = new AstHelper()
export let eventsToTransmitOnSave: AnnotationEvent[] = []
export let showResolved: boolean = false
export let tempMergedAnchors: AnchorObject[] = []
export let searchEvents: WebSearchEvent[] = []
export let browserOutputs: BrowserOutput[] = []
export let extensionContext: vscode.ExtensionContext | null = null

export const annotationDecorations =
    vscode.window.createTextEditorDecorationType({
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            // this color will be used in light color themes
            // borderColor: 'darkblue',
            border: '0.2px solid rgba(0, 0, 0, .25)',
            overviewRulerColor: 'darkgreen',
        },
        dark: {
            // this color will be used in dark color themes
            // borderColor: ,
            border: '0.2px solid rgba(217, 234, 247, .25)',
            overviewRulerColor: 'lightgreen',
        },
        backgroundColor: '#93c0ff1c',
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })

export const floatingDecorations = vscode.window.createTextEditorDecorationType(
    {
        overviewRulerLane: vscode.OverviewRulerLane.Center,
    }
)

export const setActiveEditor = (
    newActiveEditor: vscode.TextEditor | undefined
): void => {
    activeEditor = newActiveEditor
}

export const setTempAnno = (newAnno: Annotation | null): void => {
    tempAnno = newAnno
}

export const setUser = (newUser: firebase.User | null): void => {
    const oldUser = user
    user = newUser
    if (oldUser === null && user && view) {
        view.updateDisplay(annotationList, undefined, undefined, user.uid) // user was not logged in but now is
    }
}

export const setView = (newView: ViewLoader | undefined): void => {
    view = newView
}

export const setGitInfo = (newGiftInfo: { [key: string]: any }): void => {
    gitInfo = newGiftInfo
}

export const setTabSize = (newTabSize: number | string): void => {
    tabSize = newTabSize
}

export const setInsertSpaces = (newInsertSpaces: boolean | string): void => {
    insertSpaces = newInsertSpaces
}

// probably worth doing an audit to ensure that we're no longer doing the removing
// and saving of deleted annotations outside of this set
export const setAnnotationList = (newAnnotationList: Annotation[]): void => {
    const [annosToSet, annosToRemove] = partition(
        newAnnotationList,
        (a) => !a.deleted && !a.outOfDate
    )

    if (annosToRemove.length) {
        saveAnnotations(annosToRemove)
        vscode.window.visibleTextEditors.forEach((t) => {
            addHighlightsToEditor(annosToSet, t)
        })
    }

    annotationList = annosToSet
}

export const setCopiedAnnotationList = (
    newCopiedAnnotationList: { [key: string]: any }[]
): void => {
    copiedAnnotations = newCopiedAnnotationList
}

export const setStoredCopyText = (newCopyText: string): void => {
    storedCopyText = newCopyText
}

export const setCurrentColorTheme = (newCurrentColorTheme: string): void => {
    currentColorTheme = newCurrentColorTheme
}

export const setCurrentGitHubProject = (
    newCurrentGitHubProject: string
): void => {
    currentGitHubProject = utils.normalizeRepoName(newCurrentGitHubProject)
}

export const setCurrentGitHubCommit = (
    newCurrentGitHubCommit: string
): void => {
    currentGitHubCommit = newCurrentGitHubCommit
}

export const setDeletedAnnotationList = (
    newDeletedAnnotationList: Annotation[]
): void => {
    deletedAnnotations = newDeletedAnnotationList
    setAnnotationList(utils.removeOutOfDateAnnotations(annotationList))
}

export const setOutOfDateAnnotationList = (
    newOutOfDateAnnotationList: Annotation[]
): void => {
    outOfDateAnnotations = newOutOfDateAnnotationList
    setAnnotationList(utils.removeOutOfDateAnnotations(annotationList))
}

export const setSelectedAnnotationsNavigations = (
    newSelectedAnnotationsNavigationList: { [key: string]: any }[]
) => {
    selectedAnnotationsNavigations = newSelectedAnnotationsNavigationList
}

export const setTsFiles = (newTsFiles: TsFile[]): void => {
    tsFiles = newTsFiles
}

export const setChangeEvents = (newChangeEvents: ChangeEvent[]): void => {
    changes = newChangeEvents
}

export const incrementNumChangeEventsCompleted = (): void => {
    numChangeEventsCompleted++
}

export const setTrackedFiles = (
    newTrackedFiles: vscode.TextDocument | vscode.TextDocument[]
): void => {
    trackedFiles = trackedFiles.concat(newTrackedFiles)
}

export const setEventsToTransmitOnSave = (
    newEventsToTransmitOnSave: AnnotationEvent[] | AnnotationEvent
): void => {
    eventsToTransmitOnSave = eventsToTransmitOnSave.concat(
        newEventsToTransmitOnSave
    )
}

export const setSearchEvents = (newSearchEvents: WebSearchEvent[]): void => {
    searchEvents = newSearchEvents
}

export const setBrowserOutputs = (newBrowserOutputs: BrowserOutput[]): void => {
    browserOutputs = newBrowserOutputs
}

export const setShowResolved = (newShowResolved: boolean): void => {
    showResolved = newShowResolved
}

export const setTempMergedAnchors = (
    newTempMergedAnchors: AnchorObject | AnchorObject[]
): void => {
    tempMergedAnchors = Array.isArray(newTempMergedAnchors)
        ? newTempMergedAnchors
        : tempMergedAnchors.concat(newTempMergedAnchors)
}

export const setExtensionContext = (
    newExtensionContext: vscode.ExtensionContext
): void => {
    extensionContext = newExtensionContext
}

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    catseyeLog.appendLine('Starting activate')
    setExtensionContext(context)
    // initialize authentication and listeners for annotations
    commands.init()
    vscode.window.activeTextEditor &&
        astHelper.addSourceFile(vscode.window.activeTextEditor.document)

    /*************************************************************************************/
    /******************************** EXTENSION LISTENERS  *******************************/
    /*************************************************************************************/

    let didChangeVisibleListenerDisposable =
        vscode.window.onDidChangeVisibleTextEditors(
            eventHandlers.handleChangeVisibleTextEditors
        )
    let didChangeActiveEditorListenerDisposable =
        vscode.window.onDidChangeActiveTextEditor(
            eventHandlers.handleChangeActiveTextEditor
        )
    let didChangeTextEditorSelectionDisposable =
        vscode.window.onDidChangeTextEditorSelection(
            eventHandlers.handleDidChangeTextEditorSelection
        )
    let didChangeActiveColorTheme = vscode.window.onDidChangeActiveColorTheme(
        eventHandlers.handleDidChangeActiveColorTheme
    )

    let didSaveListenerDisposable = vscode.workspace.onDidSaveTextDocument(
        eventHandlers.handleDidSaveDidClose
    )
    let didCloseListenerDisposable = vscode.workspace.onDidCloseTextDocument(
        eventHandlers.handleDidSaveDidClose
    )
    let didChangeTextDocumentDisposable =
        vscode.workspace.onDidChangeTextDocument(
            eventHandlers.handleDidChangeTextDocument
        )

    // let didOpenTextDocumentDisposable = vscode.workspace.onDidOpenTextDocument(
    //     eventHandlers.handleDidOpenTextDocument
    // )

    let didStartDebugSessionDisposable = vscode.debug.onDidStartDebugSession(
        debug.handleOnDidStartDebugSession
    )

    /*************************************************************************************/
    /**************************************** COMMANDS ***********************************/
    /*************************************************************************************/

    let createViewDisposable = vscode.commands.registerCommand(
        'catseye.launch',
        () => commands.createView(context)
    )
    let annotateDisposable = vscode.commands.registerCommand(
        'catseye.addAnnotation',
        () => commands.createNewAnnotation()
    )
    // let annotateFileDisposable = vscode.commands.registerCommand(
    //     'catseye.addFileAnnotation',
    //     (context: any) => commands.createFileAnnotation(context)
    // )
    let highlightDisposable = vscode.commands.registerCommand(
        'catseye.addHighlight',
        () => commands.addNewHighlight()
    )
    let selectedDisposable = vscode.commands.registerCommand(
        'catseye.addSelectedAnnotation',
        () => commands.addNewSelectedAnnotation()
    )
    let navigateForwardSelectedDisposable = vscode.commands.registerCommand(
        'catseye.navigateForward',
        () => commands.navigateSelectedAnnotations('forward')
    )
    let navigateBackSelectedDisposable = vscode.commands.registerCommand(
        'catseye.navigateBack',
        () => commands.navigateSelectedAnnotations('back')
    )
    let scrollDisposable = vscode.commands.registerCommand(
        'catseye.showAnnoInWebview',
        (id) => commands.showAnnoInWebview(id)
    )

    let createHistoryDisposable = vscode.commands.registerCommand(
        'catseye.createHistoryAnnotation',
        () => commands.createHistoryAnnotation()
    )

    let createAutomatedAnnotationDisposable = vscode.commands.registerCommand(
        'catseye.createAutomatedAnnotation',
        (json) => {
            const { range, documentUri, annotationContent, originalRange } =
                json
            console.log('json', json)
            commands.createAutomatedAnnotation(
                range,
                originalRange,
                documentUri,
                annotationContent
            )
        }
    )

    // let copyDisposable = vscode.commands.registerTextEditorCommand(
    //     'editor.action.clipboardCopyAction',
    //     commands.overriddenClipboardPasteAction
    // )
    // let cutDisposable = vscode.commands.registerTextEditorCommand(
    //     'editor.action.clipboardCutAction',
    //     commands.overriddenClipboardCutAction
    // )

    let pasteDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardPasteAction',
        commands.overriddenClipboardPasteAction
    )

    // console.log('lmaoooo', await vscode.commands.getCommands())

    /*************************************************************************************/
    /******************************************* MISC ************************************/
    /*************************************************************************************/

    vscode.commands.executeCommand(
        'setContext',
        'catseye.showAnchorMenuOptions',
        true
    )

    let hoverProviderDisposable = new HoverController()
    let commentProviderDisposable = new ConvertCommentHoverController()

    /*************************************************************************************/
    /**************************************** DISPOSABLES ********************************/
    /*************************************************************************************/

    context.subscriptions.push(didChangeVisibleListenerDisposable)
    context.subscriptions.push(didChangeActiveEditorListenerDisposable)
    context.subscriptions.push(didChangeTextEditorSelectionDisposable)
    context.subscriptions.push(didChangeActiveColorTheme)
    context.subscriptions.push(didSaveListenerDisposable)
    context.subscriptions.push(didCloseListenerDisposable)
    context.subscriptions.push(didChangeTextDocumentDisposable)
    // context.subscriptions.push(didOpenTextDocumentDisposable)
    context.subscriptions.push(didStartDebugSessionDisposable)

    context.subscriptions.push(createViewDisposable)
    context.subscriptions.push(annotateDisposable)
    // context.subscriptions.push(annotateFileDisposable)
    context.subscriptions.push(highlightDisposable)
    context.subscriptions.push(selectedDisposable)
    context.subscriptions.push(navigateForwardSelectedDisposable)
    context.subscriptions.push(navigateBackSelectedDisposable)
    context.subscriptions.push(scrollDisposable)
    context.subscriptions.push(createHistoryDisposable)
    context.subscriptions.push(createAutomatedAnnotationDisposable)
    // context.subscriptions.push(copyDisposable)
    // context.subscriptions.push(cutDisposable)
    context.subscriptions.push(pasteDisposable)

    context.subscriptions.push(hoverProviderDisposable)
    context.subscriptions.push(commentProviderDisposable)
    catseyeLog.appendLine('Activation complete')
}

// // this method is called when your extension is deactivated
export function deactivate() {}
