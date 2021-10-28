import * as React from "react";
// import { useEffect } from "react"; // -- may bring back for prop bugs
import { useState } from "react";
import NewAnnotation from "./components/newAnnotation";
import AnnotationList from "./components/annotationList";
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
  const [currentProject, setCurrentProject] = useState("");
  const [currentFile, setCurrentFile] = useState("");

  const handleIncomingMessages = (e: MessageEvent<any>) => {
    const message = e.data;
    switch(message.command) {
      case 'login':
        setShowLogin(true);
        return;
      case 'loggedIn':
        setShowLogin(false);
        return;
      case 'update':
        if(message.payload.annotationList) setAnnotations(message.payload.annotationList);
        if(message.payload.currentFile) setCurrentFile(message.payload.currentFile)
        if(message.payload.currentProject) setCurrentProject(message.payload.currentProject)
        return;
      case 'newAnno':
        setSelection(message.payload.selection);
        setShowNewAnnotation(true);
        return;
      case 'scrollToAnno':
        const annoDiv: HTMLElement | null = document.getElementById(message.payload.id);
        annoDiv?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
    }
  }

  React.useEffect(() => {
    window.addEventListener('message', handleIncomingMessages);
    return () => {
      window.removeEventListener('message', handleIncomingMessages);
    }
  }, [])


  const notifyDone = () : void => {
    setShowNewAnnotation(false);
  }

  return (
    <React.Fragment>
      {showNewAnnotation ? (
        <NewAnnotation selection={selection} vscode={vscode} notifyDone={notifyDone} />
      ) : (null)}
      {!showLogin && <AnnotationList currentFile={currentFile} currentProject={currentProject} annotations={annotations} vscode={vscode} window={window} />}
      {showLogin && <LogIn vscode={vscode} />}
    </React.Fragment>
  )
}

export default AdamitePanel;