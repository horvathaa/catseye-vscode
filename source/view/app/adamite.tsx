import * as React from "react";
// import { useEffect } from "react"; // -- may bring back for prop bugs
import { useState } from "react";
import Annotation from '../../constants/constants';
import ReactAnnotation from './components/annotation';
import NewAnnotation from "./components/newAnnotation";
import LogIn from './components/login';
import styles from './styles/adamite.module.css';
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
  currentFile: string;
}

const AnnotationList: React.FC<AnnoListProps> = ({ annotations, vscode, window, currentFile }) => {
  console.log('currentFile', currentFile);
  const showHideCluster = (e: any) => {
    // console.log('e', e);
    const div = e.target.nextElementSibling;
    // console.log('div', div, div.classList);
    if(div.classList.contains(styles['showing'])) {
        div.classList.remove(styles['showing']);
        div.classList.add(styles['hiding']);
    }
    else {
        div.classList.remove(styles['hiding']);
        div.classList.add(styles['showing']);
    }
  }
  
  const createClusters = () => {
    let output = {
      'Current File': [],
      'Current Project': [],
      'Other Projects': []
    };
    annotations.forEach((a: Annotation) => {
      let file = a.visiblePath;
      const slash: string = a.visiblePath.includes('/') ? '/' : '\\';
      if(file === currentFile) {
        output['Current File'].push(a);
      }
      else if(a.visiblePath.split(slash)[0] === currentFile.split(slash)[0]) {
        output['Current Project'].push(a)
      }
      else {
        output['Other Projects'].push(a)
      }
    });
    const jsx : React.ReactElement[] = [];
    for(const key in output) {
      const header = output[key].length === 1 ? 'annotation' : 'annotations';
      jsx.push(
        <div>
          <div onClick={showHideCluster} id={key} className={styles['subheading']}>
            {key} ({output[key].length} {header})
          </div>
          <div className={styles['showing']}>
            {output[key].map((a: Annotation, index: number) => {
                return <ReactAnnotation key={index} annotation={a} vscode={vscode} window={window} />
            })}
          </div>
        </div>
      )
    }

    return jsx;
  }

  return (
    <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
      {createClusters()}
    </ul>
  )
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
  const [currentFile, setCurrentFile] = useState("");

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
        setCurrentFile(message.payload.currentFile)
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
      {!showLogin && <AnnotationList currentFile={currentFile} annotations={annotations} vscode={vscode} window={window} />}
      {showLogin && <LogIn vscode={vscode} />}
    </React.Fragment>
  )
}

export default AdamitePanel;