import * as vscode from "vscode";
import * as path from "path";
import { Annotation } from '../constants/constants';
import { annotationList, user, gitInfo, activeEditor, adamiteLog } from '../extension';
import { getProjectName } from "../utils/utils";
export default class ViewLoader {
  public _panel: vscode.WebviewPanel | undefined;
  private readonly _extensionPath: string;

  constructor(fileUri: vscode.Uri, extensionPath: string) {
    this._extensionPath = extensionPath;
    adamiteLog.appendLine(`Creating ViewLoader at ${extensionPath}`);
    if (annotationList) {
      adamiteLog.appendLine(`Creating WebviewPanel`);
      adamiteLog.appendLine(`localResourceRoots: ${vscode.Uri.file(path.join(extensionPath, "dist"))}`);
      this._panel = vscode.window.createWebviewPanel(
        "adamite",
        "Catseye",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(extensionPath, "dist"))
          ]
        }
      );
      // this._panel.iconPath = vscode.Uri.file(path.join(extensionPath, 'source/constants/Adamite.png')); 
      this._panel.webview.html = this.getWebviewContent(annotationList);
    }
  }

  private getWebviewContent(annotationList: Annotation[]) : string {
    // Local path to main script run in the webview
    const reactAppPathOnDisk = vscode.Uri.file(
      path.join(this._extensionPath, "dist", "configViewer.js")
    );
    const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });
    const annotationJson = JSON.stringify(annotationList);
    const userId = JSON.stringify(user?.uid);
    const username = JSON.stringify(gitInfo.author);
    const currentFile = JSON.stringify(activeEditor?.document.uri.toString());
    const currentProject = JSON.stringify(getProjectName(activeEditor?.document.uri.toString()));
    let webviewContent = `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Config View</title>

          <meta http-equiv="Content-Security-Policy"
                      content="default-src 'none';
                              img-src https:;
                              script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
                              style-src vscode-resource: 'unsafe-inline';">

          <script>
            window.acquireVsCodeApi = acquireVsCodeApi;
            window.data = ${annotationJson}
            window.userId = ${userId}
            window.username = ${username}
            window.currentFile = ${currentFile}
            window.currentProject = ${currentProject}
          </script>
      </head>
      <body>
          <div id="root"></div>

          <script src="${reactAppUri}"></script>
      </body>
    </html>`

    adamiteLog.appendLine(`Webview content: ${webviewContent}`);
    
    return webviewContent;
  }

  public init() {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'init',
      })
    }
  }

  public reload(username: string, userId: string) {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'reload',
        payload: {
          username,
          userId
        }
      })
    }
  }

  public updateHtml(html: string, anchorText: string, anchorPreview: string, id: string) {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'newHtml',
        payload: {
          html,
          anchorText,
          anchorPreview,
          id
        }
      })
    }
  }

  public updateDisplay(annotationList: Annotation[] | undefined, currentFile: string | undefined = undefined, currentProject: string | undefined = undefined) {
      if(this._panel && this._panel.webview) {
        this._panel.webview.postMessage({
          command: 'update',
          payload: {
            annotationList,
            currentFile,
            currentProject
          }
        })
      }
  }

  public createNewAnno(selection: string, annotationList: Annotation[]) {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'newAnno',
        payload: {
          selection,
          annotations: annotationList
        }
      })
    }
  }

  public logIn() {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'login',
      })
    }
  }

  public scrollToAnnotation(id: string) {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'scrollToAnno',
        payload: {
          id
        }
      })
    }
  }

  public addTerminalMessage(content: string) {
    if(this._panel && this._panel.webview) {
      this._panel.webview.postMessage({
        command: 'addTerminalMessage',
        payload: {
          content
        }
      })
    }
  }
}
