/*
 *
 * ViewLoader.ts
 * Intermediary class between VS Code's Webview API, our extension, and our bootstrapped React implementation
 * For more information, check this Medium article out: https://medium.com/younited-tech-blog/reactception-extending-vs-code-extension-with-webviews-and-react-12be2a5898fd
 *
 */
import * as vscode from 'vscode'
import * as path from 'path'
import {
    AnchorObject,
    Annotation,
    BrowserOutput,
    WebSearchEvent,
    // AnnotationAnchorPair,
} from '../constants/constants'
import {
    annotationList,
    user,
    gitInfo,
    activeEditor,
    catseyeLog,
    searchEvents,
    browserOutputs,
} from '../extension'
import {
    // getGithubUrl,
    getProjectName,
    getStableGitHubUrl,
    // getVisiblePath,
} from '../utils/utils'
import { AnnotationAnchorDuplicatePair } from '../viewHelper/viewHelper'
export default class ViewLoader {
    public _panel: vscode.WebviewPanel | undefined
    private readonly _extensionPath: string
    private readonly _newUser: boolean

    // create the webview and point it to our compiled/bundled extension
    constructor(
        fileUri: vscode.Uri,
        extensionPath: string,
        newUser: boolean = false
    ) {
        this._extensionPath = extensionPath
        this._newUser = newUser
        catseyeLog.appendLine(`Creating ViewLoader at ${extensionPath}`)
        if (annotationList) {
            catseyeLog.appendLine(`Creating WebviewPanel`)
            catseyeLog.appendLine(
                `localResourceRoots: ${vscode.Uri.file(
                    path.join(extensionPath, 'dist')
                )}`
            )
            this._panel = vscode.window.createWebviewPanel(
                'catseye',
                'Catseye',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(extensionPath, 'dist')),
                    ],
                }
            )
            this._panel.iconPath = vscode.Uri.file(
                path.join(extensionPath, 'source/constants/catseye.png')
            )
            this._panel.webview.html = this.getWebviewContent(annotationList)
        }
    }

    // generate our "HTML" which will be used to load our React code
    private getWebviewContent(annotationList: Annotation[]): string {
        // Local path to main script run in the webview
        const reactAppPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'dist', 'configViewer.js')
        )
        const reactAppUri = reactAppPathOnDisk.with({
            scheme: 'vscode-resource',
        })
        // These variables will be passed into the webview
        const annotationJson: string = JSON.stringify(annotationList)
        const userId = JSON.stringify(user ? user.uid : '')
        const username = JSON.stringify(gitInfo.author)
        const colorTheme = JSON.stringify(vscode.window.activeColorTheme)
        const currentProject = JSON.stringify(
            getProjectName(activeEditor?.document.uri.toString())
        )
        const searchEventsToPass = JSON.stringify(searchEvents)
        const browserOutputsToPass = JSON.stringify(browserOutputs)
        const currentFile = activeEditor
            ? JSON.stringify(
                  getStableGitHubUrl(activeEditor?.document.uri.fsPath)
              )
            : JSON.stringify(
                  getStableGitHubUrl(
                      vscode.window.visibleTextEditors[0].document.uri.fsPath
                  )
              )

        let webviewContent = `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/github.min.css" />
          <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Catseye</title>

          <meta http-equiv="Content-Security-Policy"
                      content="default-src 'none';
                              img-src https: data:;
                              script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
                              style-src vscode-resource: 'unsafe-inline';">

          <script>
            window.acquireVsCodeApi = acquireVsCodeApi;
            window.data = ${annotationJson}
            window.userId = ${userId}
            window.colorTheme = ${colorTheme}
            window.username = ${username}
            window.currentFile = ${currentFile}
            window.currentProject = ${currentProject}
            window.searchEvents = ${searchEventsToPass}
            window.browserOutputs = ${browserOutputsToPass}
            window.login = ${user === null}
            window.newUser = ${this._newUser}
          </script>
      </head>
      <body>
          <div id="root"></div>
          <script src="${reactAppUri}"></script>
      </body>
    </html>`

        this.printLaunchDetailsToLog(
            annotationJson,
            userId,
            username,
            currentFile,
            currentProject
        )

        // catseyeLog.appendLine(`Webview content: ${webviewContent}`)

        return webviewContent
    }

    private printLaunchDetailsToLog(
        annotationJson: string,
        userId: string,
        username: string,
        currentFile: string,
        currentProject: string
    ) {
        if (annotationJson !== '[]') {
            catseyeLog.appendLine("Annotation's serialized")
        } else {
            catseyeLog.appendLine('WARNING: No annotations found')
        }
        if (userId !== '') {
            catseyeLog.appendLine('Received userId')
        } else {
            catseyeLog.appendLine('WARNING: No user ID found')
        }
        if (username !== '') {
            catseyeLog.appendLine(`Got GitHub name ${username}`)
        } else {
            catseyeLog.appendLine('WARNING: Could not find GitHub username')
        }
        if (currentFile !== '') {
            catseyeLog.appendLine(`Showing file ${currentFile}`)
        } else {
            catseyeLog.appendLine('WARNING: Could not identify current file')
        }
        if (currentProject !== '') {
            catseyeLog.appendLine(
                `User is working on project ${currentProject}`
            )
        } else {
            catseyeLog.appendLine('WARNING: Could not identify current project')
        }
        if (this._newUser) {
            catseyeLog.appendLine('Showing first-time user information')
        }
    }

    // methods our extension can call to interface with the webview...
    // example usage: view.init() --> will create webview

    public init() {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'init',
            })
        }
    }

    public reload(username: string, userId: string) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'reload',
                payload: {
                    username,
                    userId,
                },
            })
        }
    }

    public updateHtml(
        html: string,
        anchorText: string,
        anchorPreview: string,
        id: string
    ) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'newHtml',
                payload: {
                    html,
                    anchorText,
                    anchorPreview,
                    id,
                },
            })
        }
    }

    public updateDisplay(
        annotationList: Annotation[] | undefined,
        currentFile: string | undefined = undefined,
        currentProject: string | undefined = undefined,
        currentUser: string | undefined = undefined
    ) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'update',
                payload: {
                    annotationList,
                    currentFile,
                    currentProject,
                    currentUser,
                },
            })
        }
    }

    public createNewAnno(
        annoId: string,
        anchorObject: AnchorObject,
        annotationList: Annotation[]
    ) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'newAnno',
                payload: {
                    annoId,
                    anchorObject: [anchorObject],
                    annotations: annotationList,
                },
            })
        }
    }

    public logIn() {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'login',
            })
        }
    }

    public scrollToAnnotation(id: string) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'scrollToAnno',
                payload: {
                    id,
                },
            })
        }
    }

    public addTerminalMessage(content: string) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'addTerminalMessage',
                payload: {
                    content,
                },
            })
        }
    }

    public sendAnchorsToMergeAnnotation(
        anchors: AnchorObject[],
        removedAnchorIds: AnnotationAnchorDuplicatePair[], // should have interface for anchor anno pair
        usedAnnoIds: string[]
    ) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'receiveAnchors',
                payload: {
                    anchors,
                    removedAnchorIds,
                    usedAnnoIds,
                },
            })
        }
    }

    public sendNewAnchorForNewAnnotation(anchor: AnchorObject) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'newAnchorForNewAnnotation',
                payload: {
                    anchor,
                },
            })
        }
    }

    public sendNewColorTheme(theme: vscode.ColorTheme) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'newColorTheme',
                payload: {
                    theme,
                },
            })
        }
    }

    public sendNewSearchEvent(searchEvent: WebSearchEvent) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'newSearchEvent',
                payload: {
                    searchEvent,
                },
            })
        }
    }

    public sendNewBrowserOutput(browserOutput: BrowserOutput) {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'newBrowserOutput',
                payload: {
                    browserOutput,
                },
            })
        }
    }

    public addAnnotatedOutput() {
        if (this._panel && this._panel.webview) {
            this._panel.webview.postMessage({
                command: 'addAnnotatedOutput',
            })
        }
    }
    // public showNewUserDialogue() {
    //     if (this._panel && this._panel.webview) {
    //         this._panel.webview.postMessage({
    //             command: 'newUser',
    //         })
    //     }
    // }
}
