// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
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


	const annotationDecorations = vscode.window.createTextEditorDecorationType({
		borderWidth: '1px',
		borderStyle: 'solid',
		overviewRulerColor: 'blue',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		light: {
			// this color will be used in light color themes
			borderColor: 'darkblue'
		},
		dark: {
			// this color will be used in dark color themes
			borderColor: 'lightblue'
		}
	});

	let activeEditor = vscode.window.activeTextEditor;
	context.subscriptions.push(vscode.commands.registerCommand('adamite.sel', () => {
		const { activeTextEditor } = vscode.window;
		if (!activeTextEditor) {
			vscode.window.showInformationMessage("No text editor is open!");
			return;
		  }
		  
		vscode.window.showInformationMessage(" text editor is open!");
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
		
		let highLighted: vscode.Range[] = [];
		highLighted.push(r);
		if(activeEditor)
			activeEditor.setDecorations(annotationDecorations, highLighted);


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
	  	<h2 id = "lines-of-code-counter">No code selected!</h2>
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

// this method is called when your extension is deactivated
export function deactivate() {}
