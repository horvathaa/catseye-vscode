import * as React from "react";
import * as ReactDOM from "react-dom";

import AdamitePanel from "./adamite";
import Annotation from '../../extension'

declare global {
  interface Window {
    acquireVsCodeApi(): any;
    initialData: Annotation[];
  }
}

const vscode = window.acquireVsCodeApi();
console.log('in index', window.initialData)

ReactDOM.render(
  <AdamitePanel vscode={vscode} initialData={window.initialData} />,
  document.getElementById("root")
);