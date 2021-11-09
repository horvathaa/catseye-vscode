import * as React from "react";
import { buildAnnotation } from '../viewUtils';
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import AnnotationDropDown from './annotationComponents/annotationMenu';
import Anchor from './annotationComponents/anchor';
import TextEditor from "./annotationComponents/textEditor";
import UserProfile from "./annotationComponents/userProfile";

interface Props {
  annotation: Annotation;
  vscode: any;
  window: Window;
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode, window }) => {
  const [anno, setAnno] = React.useState(annotation);
  const [edit, setEdit] = React.useState(false);

  const handleIncomingMessages = (e: MessageEvent<any>) => {
    const message = e.data;
    switch(message.command) {
      case 'newHtml':
        const { html, anchorText, anchorPreview, id } = message.payload;
        if(id === anno.id) {
          const newAnno = { ...anno, html: html, anchorText: anchorText, anchorPreview: anchorPreview};
          setAnno(buildAnnotation(newAnno));
        }
        break;
    }
  }

  React.useEffect(() => {
    window.addEventListener('message', handleIncomingMessages);
    return () => {
      window.removeEventListener('message', handleIncomingMessages)
    }
  }, []);

  React.useEffect(() => {
    if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
      setAnno(annotation);
    }
  }, [annotation]);

  const scrollInEditor = () => {
    vscode.postMessage({
      command: 'scrollInEditor',
      id: anno.id
    });
  }

  const updateContent = (newAnnoContent: string) => {
    anno.annotation = newAnnoContent;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      newAnnoContent: anno.annotation
    });
    setEdit(false);
  }

  const cancelAnnotation = () => {
    setEdit(false);
  }

  const deleteAnnotation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      command: 'deleteAnnotation',
      annoId: anno.id,
    });
  }

  return (
      <React.Fragment>
          <div key={annotation.id} className={styles['Pad']} id={annotation.id} >
              <li key={annotation.id} className={styles['AnnotationContainer']}  >
                <div className={styles['topRow']}>
                  <UserProfile 
                    githubUsername={anno.githubUsername} 
                    createdTimestamp={anno.createdTimestamp} 
                  />
                  <div className={styles['IconContainer']}>
                    <AnnotationDropDown 
                      id={anno.id}
                      editAnnotation={() => { setEdit(!edit) }} 
                      deleteAnnotation={(e) => deleteAnnotation(e)}
                    />
                  </div>
                </div>
                <Anchor 
                  html={anno.html} 
                  anchorPreview={anno.anchorPreview} 
                  visiblePath={anno.visiblePath}
                  startLine={anno.startLine}
                  endLine={anno.endLine}
                  scrollInEditor={scrollInEditor}
                />
                <div className={styles['ContentContainer']}>
                  {edit ? (
                    <TextEditor 
                      annoContent={anno.annotation} 
                      submissionHandler={updateContent} 
                      cancelHandler={cancelAnnotation}
                    />
                  ) : (`${anno.annotation}`)}
                </div>
              </li>
            </div>
      </React.Fragment>
  )

}

export default ReactAnnotation;