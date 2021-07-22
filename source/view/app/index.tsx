import * as React from "react";
import * as ReactDOM from "react-dom";

import AdamitePanel from "./adamite";
import Annotation from '../../extension'

declare global {
  interface Window {
    acquireVsCodeApi(): any;
    initialData: Annotation[];
    addEventListener(): any;
  }
}

const vscode = window.acquireVsCodeApi();

window.addEventListener('message', event => {
  const message = event.data;
  switch(message.command) {
    case 'update': 
      ReactDOM.render(
        <AdamitePanel vscode={vscode} initialData={message.payload.annotationList} />, 
        document.getElementById('root')
      );
  }
})

ReactDOM.render(
  <AdamitePanel vscode={vscode} initialData={window.initialData} />,
  document.getElementById("root")
);