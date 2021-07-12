// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let selectionRangeProviderDisposable: vscode.Disposable | undefined;
// function registerSelectionRangeProvider() {
// 	return vscode.languages.registerHoverProvider("*", {
// 		provideHover: async (
// 		  document: vscode.TextDocument,
// 		  position: vscode.Position
// 		) => {
// 		  if (!store.activeEditorSteps) {
// 			return;
// 		  }
	
// 		  const tourSteps = store.activeEditorSteps.filter(
// 			([, , , line]) => line === position.line
// 		  );
// 		  const hovers = tourSteps.map(([]) => {
// 			const args = encodeURIComponent(JSON.stringify([tour.id, stepNumber]));
// 			const command = `command:codetour._startTourById?${args}`;
// 			return `CodeTour: ${tour.title} (Step #${
// 			  stepNumber + 1
// 			}) &nbsp;[Start Tour](${command} "Start Tour")\n`;
// 		  });
	
// 		  const content = new vscode.MarkdownString(hovers.join("\n"));
// 		  content.isTrusted = true;
// 		  return new vscode.Hover(content);
// 		}
// 	  });
// 	}
// }

function getSelection() {
	const activeEditor = vscode.window.activeTextEditor;
    if (
      activeEditor &&
      activeEditor.selection &&
      !activeEditor.selection.isEmpty
    ) {
      const { start, end } = activeEditor.selection;

      // Convert the selection from 0-based
      // to 1-based to make it easier to
      // edit the JSON tour file by hand.
      const selection = {
        start: {
          line: start.line + 1,
          character: start.character + 1
        },
        end: {
          line: end.line + 1,
          character: end.character + 1
        }
      };
		console.log('selection', selection);
	}
}



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const DECORATOR = vscode.window.createTextEditorDecorationType({
		gutterIconPath: vscode.Uri.parse('./constants/Adamite.png'),
		gutterIconSize: "contain",
		overviewRulerColor: "rgb(246,232,154)",
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
	  });
	
	console.log('Congratulations, your extension "adamite" is now active!');
	let code: string[] = [];
	let panel = vscode.window.createWebviewPanel(
		'annotating', // Identifies the type of the webview. Used internally
		'ADAMITE', // Title of the panel displayed to the user
		vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
		{
			enableScripts: true
		} // Webview options. More on these later.
	  );
	context.subscriptions.push(vscode.commands.registerCommand('adamite.annotate', () => {
		// Create and show a new webview
		panel.webview.html = getWebviewContent("Hello", code);
	  })
	);

	let disposable = vscode.commands.registerCommand('adamite.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Adamite!');
	});

	context.subscriptions.push(vscode.commands.registerCommand('adamite.sel', () => {
		const { activeTextEditor } = vscode.window;
		if (!activeTextEditor) {
			vscode.window.showInformationMessage("No text editor is open!");
			return;
		  }
		  
		vscode.window.showInformationMessage(" text editor is open!");
		
		// const text = activeTextEditor.document.getText(
		// 	activeTextEditor.selection
		// );
		// const { start, end } = activeTextEditor.selection;
		// const range = [new vscode.Range(start, end)];
		// activeTextEditor.setDecorations(DECORATOR, range);
		// console.log('did something', DECORATOR)

		// console.log(text);


		// getSelection();
		

		// panel.webview.postMessage({
		// 	type: "selected",
		// 	value: text,
		// });
		const text = activeTextEditor.document.getText(
			activeTextEditor.selection
		);
		//console.log(text);
		code.push(text);
		for(var i = 0; i < code.length; i++)
		{ 
    		console.log(i + ": " + code[i]); 
		}

		const updateTab = () => {
			panel.webview.html = getWebviewContent(text, code);
		}
		updateTab();
		//var fl = activeTextEditor.document.lineAt(activeTextEditor.selection.active.line);
		//var el = activeTextEditor.document.lineAt(activeTextEditor.selection.active.line);
		var r = new vscode.Range(activeTextEditor.selection.start, activeTextEditor.selection.end);

		console.log(r);


	})
	);



	context.subscriptions.push(disposable);
}

function getWebviewContent(sel: string, c:string[]) {
	return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
	  <h1>Welcome to the annotation tab, where you can select code and you will see it appear here.</h1>
	  <div id = "annotations">
	  	<h2 id = "lines-of-code-counter">sfkjvdkjfbv</h2>
	  </div>
	  <script>
	  	document.getElementById('lines-of-code-counter').textContent = "${sel}";
		var tag = document.createElement("p");
		tag.textContent = "${sel}";
		document.getElementById("annotations").appendChild(tag);
		var x = document.createElement("INPUT");
		x.setAttribute("type", "text");
  		x.setAttribute("value", "Start Annotating!");
		document.getElementById("annotations").appendChild(x);

	  </script>
  </body>

  </html>`;
  }

// // this method is called when your extension is deactivated
// export function deactivate() {}
