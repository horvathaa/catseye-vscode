import * as React from "react";
// import { useEffect } from "react"; // -- may bring back for prop bugs
import { useState } from "react";
import { Annotation } from "../../constants/constants";
import ReactAnnotation from "./components/annotation";
import NewAnnotation from "./components/newAnnotation";
import AnnotationList from "./components/annotationList";
import LogIn from './components/login';
import styles from './styles/adamite.module.css';
import TopBar from "./components/topbar";
// import { areListsTheSame } from './viewUtils';
// import { annotationList } from '../../extension';

interface Props {
  vscode: any;
  window: Window;
  showLogIn: boolean;
  username?: string;
  userId?: string;
}

const AdamitePanel: React.FC<Props> = ({ vscode, window, showLogIn, username, userId }) => {
  const [annotations, setAnnotations] = useState(window.data);
  const [showLogin, setShowLogin] = useState(showLogIn);
  const [userName, setUsername] = useState(window.username ? window.username : "");
  const [uid, setUserId] = useState(window.userId ? window.userId : "");
  const [selection, setSelection] = useState("");
  const [showNewAnnotation, setShowNewAnnotation] = useState(false);
  const [showSearchedAnnotations, setShowSearchedAnnotations] = useState(false);
  const [searchedAnnotations, setSearchedAnnotations] = useState<Annotation[]>([])
  const [currentProject, setCurrentProject] = useState(window.currentProject ? window.currentProject : "");
  const [currentFile, setCurrentFile] = useState(window.currentFile ? window.currentFile : "");
  // console.log('window', window);
  
  const handleIncomingMessages = (e: MessageEvent<any>) => {
    const message = e.data;
    switch(message.command) {
      case 'login':
        setShowLogin(true);
        return;
      case 'update':
        if(message.payload.annotationList) setAnnotations(message.payload.annotationList);
        if(message.payload.currentFile) setCurrentFile(message.payload.currentFile)
        if(message.payload.currentProject) setCurrentProject(message.payload.currentProject)
        return;
      case 'newAnno':
        setSelection(message.payload.selection);
        setShowNewAnnotation(true);
        const newAnnoDiv: HTMLElement | null = document.getElementById("NewAnnotation");
        newAnnoDiv?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      case 'scrollToAnno':
        const annoDiv: HTMLElement | null = document.getElementById(message.payload.id);
        const currentFileDiv: Element | null | undefined = document.getElementById('Current File')?.nextElementSibling;
        const selectedDiv: Element | null | undefined = document.getElementById('Pinned')?.nextElementSibling;
        if(currentFileDiv && currentFileDiv.contains(annoDiv) && !currentFileDiv?.classList.contains(styles['showing'])) {
          currentFileDiv?.classList.remove(styles['hiding']);
          currentFileDiv?.classList.add(styles['showing']);
        }
        else if(selectedDiv && selectedDiv.contains(annoDiv) && !selectedDiv?.classList.contains(styles['showing'])) {
          selectedDiv?.classList.remove(styles['hiding']);
          selectedDiv?.classList.add(styles['showing']);
        }
        annoDiv?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
    }
  }

  const handleCopyText = (e: Event) : void => {
    const keyboardEvent = (e as KeyboardEvent);
    if(window && (keyboardEvent.code === 'KeyC' || keyboardEvent.code === 'KeyX') && keyboardEvent.ctrlKey) {
      const copiedText: string | undefined = window.getSelection()?.toString();
      if(copiedText)
      vscode.postMessage({
        command: 'copyTextFromWebview',
        text: copiedText
      });
    }
  }

  const getSearchedAnnotations = (annotations: Annotation[]) : void => {
    setSearchedAnnotations(annotations);
    setShowSearchedAnnotations(annotations.length > 0);
  }

  React.useEffect(() => {
    window.addEventListener('message', handleIncomingMessages);
    window.document.addEventListener('keydown', handleCopyText);
    return () => {
      window.removeEventListener('message', handleIncomingMessages);
      window.document.removeEventListener('keydown', handleCopyText);
    }
  }, []);

  React.useEffect(() => {
    if(!showLogIn && (!userName || !uid) && username && userId) {
      setUsername(username);
      setUserId(userId);
    }
  }, []);

  const notifyDone = () : void => {
    setShowNewAnnotation(false);
  }

  return (
    <React.Fragment>
      {showNewAnnotation ? (
        <NewAnnotation 
          selection={selection} 
          vscode={vscode} 
          notifyDone={notifyDone} 
        />
      ) : (null)}
      {!showLogin && 
      <>
          <TopBar 
            annotations={annotations}
            getSearchedAnnotations={getSearchedAnnotations}
          />
          {showSearchedAnnotations && searchedAnnotations.map(a => {
            return <ReactAnnotation 
                    annotation={a} 
                    vscode={vscode} 
                    window={window}
                    userId={uid}
                    username={userName}
                  />
          })}
          <AnnotationList 
            currentFile={currentFile} 
            currentProject={currentProject} 
            annotations={annotations} 
            vscode={vscode} 
            window={window}
            username={userName}
            userId={uid}
          />
        </>
      }
      {showLogin && <LogIn vscode={vscode} />}
    </React.Fragment>
  )
}

export default AdamitePanel;