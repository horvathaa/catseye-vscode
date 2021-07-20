import * as React from "react";
import * as ReactDOM from "react-dom";

import { AnnotationList } from "./model";
import AdamitePanel from "./adamite";

declare global {
  interface Window {
    acquireVsCodeApi(): any;
    initialData: AnnotationList;
  }
}

const vscode = window.acquireVsCodeApi();

ReactDOM.render(
  <AdamitePanel vscode={vscode} initialData={window.initialData} />,
  document.getElementById("root")
);