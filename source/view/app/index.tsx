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

// window.addEventListener('message', event => {
//   const message = event.data;
//   switch(message.command) {
//     case 'login':
//       ReactDOM.render(
//         <AdamitePanel 
//           vscode={vscode} 
//           data={[]} 
//           selection={""} 
//           login={true}
//           window={window}
//         />, 
//         document.getElementById('root')
//       );
//       return;
//     case 'update': 
//       ReactDOM.render(
//         <AdamitePanel 
//           vscode={vscode} 
//           data={message.payload.annotationList} 
//           selection={""} 
//           login={false}
//         />, 
//         document.getElementById('root')
//       );
//       return;
//     case 'newAnno':
//       ReactDOM.render(
//         <AdamitePanel 
//           vscode={vscode} 
//           data={message.payload.annotationList} 
//           selection={message.payload.selection} 
//           login={false}
//         />, 
//         document.getElementById('root')
//       );
//       return;
//     default:
//       return;
//   }
// })

window.addEventListener('message', event => {
  const message = event.data;
  if(message.command === 'init') {
    console.log('rendering')
    ReactDOM.render(
      <AdamitePanel vscode={vscode} window={window} />,
      document.getElementById("root")
    );
    return;
  }
})
