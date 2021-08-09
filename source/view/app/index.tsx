import * as React from "react";
import * as ReactDOM from "react-dom";

import AdamitePanel from "./adamite";
import Annotation from '../../extension'
declare global {
  interface Window {
    acquireVsCodeApi(): any;
    data: Annotation[];
    selection: string;
    addEventListener(): any;
  }
}

const vscode = window.acquireVsCodeApi();

window.addEventListener('message', event => {
  const message = event.data;
  switch(message.command) {
    case 'update': 
      ReactDOM.render(
        <AdamitePanel vscode={vscode} data={message.payload.annotationList} selection={""} />, 
        document.getElementById('root')
      );
      return;
    case 'newAnno':
      ReactDOM.render(
        <AdamitePanel vscode={vscode} data={message.payload.annotationList} selection={message.payload.selection} />, 
        document.getElementById('root')
      );
      return;
    default:
      return;

  }
})

ReactDOM.render(
  <AdamitePanel vscode={vscode} data={window.data} selection={""} />,
  document.getElementById("root")
);