import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";


import { AnnotationList,  ICommand, CommandAction } from "./app/model";

export default class ViewLoader {
  private readonly _panel: vscode.WebviewPanel | undefined;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  constructor(fileUri: vscode.Uri, extensionPath: string) {
    this._extensionPath = extensionPath;

    let annotationList = this.getFileContent(fileUri);
    if (annotationList) {
      this._panel = vscode.window.createWebviewPanel(
        "adamite",
        "Adamite",
        vscode.ViewColumn.One,
        {
          enableScripts: true,

          localResourceRoots: [
            vscode.Uri.file(path.join(extensionPath, "dist"))
          ]
        }
      );

      this._panel.webview.html = this.getWebviewContent(annotationList);

      this._panel.webview.onDidReceiveMessage(
        (command: ICommand) => {
          switch (command.action) {
            case CommandAction.Save:
              this.saveFileContent(fileUri, command.content);
              return;
          }
        },
        undefined,
        this._disposables
      );
    }
  }

  private getWebviewContent(annotationList: AnnotationList): string {
    // Local path to main script run in the webview
    const reactAppPathOnDisk = vscode.Uri.file(
      path.join(this._extensionPath, "dist", "configViewer.js")
    );
    const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });

    const annotationJson = JSON.stringify(annotationList);
    console.log('annotationJson', annotationJson)

    return `<!DOCTYPE html>
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
          window.initialData = ${annotationJson}
        </script>
    </head>
    <body>
        <div id="root"></div>

        <script src="${reactAppUri}"></script>
    </body>
    </html>`;
  }

  private getFileContent(fileUri: vscode.Uri): AnnotationList | undefined {
    if (fs.existsSync(fileUri.fsPath + '/test.json')) {
      let content = fs.readFileSync(fileUri.fsPath + '/test.json', "utf8");
      let annotationList: AnnotationList = JSON.parse(content);
      console.log('annotationList', annotationList);

      return annotationList;
    }
    return undefined;
  }

  private saveFileContent(fileUri: vscode.Uri, annotationList: AnnotationList) {
    if (fs.existsSync(fileUri.fsPath + '/test.json')) {
      let content: string = JSON.stringify(annotationList);
      fs.writeFileSync(fileUri.fsPath + '/test.json', content);

      vscode.window.showInformationMessage(
        `👍 Annotations saved to ${fileUri.fsPath + '/test.json'}`
      );
    }
  }
}
