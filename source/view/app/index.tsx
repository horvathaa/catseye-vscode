import * as React from "react";
import * as ReactDOM from "react-dom";
import AdamitePanel from "./adamite";
import Annotation from '../../constants/constants'
declare global {
  interface Window {
    acquireVsCodeApi(): any;
    data: Annotation[];
    selection: string;
    login: boolean;
    addEventListener(): any;
  }
}

const vscode = window.acquireVsCodeApi();

window.addEventListener('message', event => {
  const message = event.data;
  if(message.command === 'init') {
    ReactDOM.render(
      <AdamitePanel vscode={vscode} window={window} showLogIn={true} />,
      document.getElementById("root")
    );
    return;
  }
  else if (message.command === 'reload') {
    ReactDOM.render(
      <AdamitePanel vscode={vscode} window={window} showLogIn={false} username={message.payload.username} userId={message.payload.userId} />,
      document.getElementById("root")
    );
  }
})
