import * as React from "react";
import { useEffect } from "react"; // -- may bring back for prop bugs
import { useState } from "react";
import Annotation from '../../constants/constants';
import ReactAnnotation from './components/annotation';
import NewAnnotation from "./components/newAnnotation";
import LogIn from './components/login';
// import { annotationList } from '../../extension';


const areListsTheSame = (obj1: any, obj2: any) => {
	for (var p in obj1) {
		  //Check property exists on both objects
		  if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;
   
		  switch (typeof (obj1[p])) {
			  //Deep compare objects
			  case 'object':
				  if (areListsTheSame(obj1[p], obj2[p])) return false;
				  break;
			  //Compare function code
			  case 'function':
				  if (typeof (obj2[p]) == 'undefined' || (p != 'compare' && obj1[p].toString() != obj2[p].toString())) return false;
				  break;
			  //Compare values
			  default:
				  if (obj1[p] != obj2[p]) return false;
		  }
	  }
   
	  //Check object 2 for any extra properties
	  for (var p in obj2) {
		  if (typeof (obj1[p]) == 'undefined') return false;
	  }
	  return true;
}

interface AnnoListProps {
  annotations: Annotation[];
  vscode: any;
  window: Window;
}

const AnnotationList: React.FC<AnnoListProps> = ({ annotations, vscode, window }) => {
  return <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
    {annotations.map((anno: Annotation) => {
      return (
        <ReactAnnotation annotation={anno} vscode={vscode} window={window} />
      )
    })}
  </ul>
}

interface Props {
  vscode: any;
  window: Window;
  showLogIn: boolean
}

const AdamitePanel: React.FC<Props> = ({ vscode, window, showLogIn }) => {
  const [annotations, setAnnotations] = useState([]);
  const [showLogin, setShowLogin] = useState(showLogIn);
  const [selection, setSelection] = useState("");
  const [showNewAnnotation, setShowNewAnnotation] = useState(false);

  window.addEventListener('message', event => {
    const message = event.data;
    switch(message.command) {
      case 'login':
        setShowLogin(true);
        return;
      case 'loggedIn':
        setShowLogin(false);
        return;
      case 'update':
        setAnnotations(message.payload.annotationList);
        return;
      case 'newAnno':
        setSelection(message.payload.selection);
        setShowNewAnnotation(true);
        return;
    }
  })

  const notifyDone = () : void => {
    setShowNewAnnotation(false);
  }

  return (
    <React.Fragment>
      {showNewAnnotation ? (
        <NewAnnotation selection={selection} vscode={vscode} notifyDone={notifyDone} />
      ) : (null)}
      {!showLogin && <AnnotationList annotations={annotations} vscode={vscode} window={window} />}
      {showLogin && <LogIn vscode={vscode} />}
    </React.Fragment>
  )
}

export default AdamitePanel;