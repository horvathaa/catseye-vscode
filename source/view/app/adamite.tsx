import * as React from "react";
// import { useEffect } from "react"; // -- may bring back for prop bugs
import { useState } from "react";
import NewAnnotation from "./components/newAnnotation";
import AnnotationList from "./components/annotationList";
import LogIn from './components/login';
import styles from './styles/adamite.module.css';
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
  const [currentProject, setCurrentProject] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  // const [currentUrl, setCurrentlUrl] = useState("");


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
        return;
      case 'scrollToAnno':
        const annoDiv: HTMLElement | null = document.getElementById(message.payload.id);
        const currentFileDiv: Element | null | undefined = document.getElementById('Current File')?.nextElementSibling;
        if(!currentFileDiv?.classList.contains(styles['showing'])) {
          currentFileDiv?.classList.remove(styles['hiding']);
          currentFileDiv?.classList.add(styles['showing']);
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
        <AnnotationList 
          currentFile={currentFile} 
          currentProject={currentProject} 
          annotations={annotations} 
          vscode={vscode} 
          window={window}
          username={userName}
          userId={uid}
        />
      }
      {showLogin && <LogIn vscode={vscode} />}
    </React.Fragment>
  )
}

export default AdamitePanel;