import * as React from "react";
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import { useEffect } from "react";
import AnnotationDropDown from './annotationComponents/annotationMenu';

interface SynProps {
  html: string;
}

const Syntax: React.FC<SynProps> = ({ html }) => {
  return ( <code dangerouslySetInnerHTML={{__html: html}}></code> );
}


interface Props {
  annotation: Annotation;
  vscode: any;
  window: Window;
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode, window }) => {
  const [anno, setAnno] = React.useState(annotation);
  const [edit, setEdit] = React.useState(false);
  const [newContent, setNewContent] = React.useState(anno.annotation);
  // let keys = {};

  useEffect(() => {
    if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
      setAnno(annotation);
    }
  });

  window.addEventListener('message', event => {
    const message = event.data;
    switch(message.command) {
      case 'dragNewAnno':
        console.log('yes');
        break;
    }
  });

  // const handleSelect = (e: any) => {
  //   console.log('e', e);
  // }

  // const handleKeyUp = (e: React.SyntheticEvent) => {
  //   console.log('e', e, anno.id);
  //   // keys[e.key] = true;
  // }


  // const handleKeyDown = (e: any) => {
  //   console.log('e', e);
  // }
  // document.addEventListener('mouseenter', handleCopy);
  // Idea: use onDragOver and onDrop to allow user to drop code into the sidebar - may have to have
  // similar event listener in the editor? but I'm not sure how we can override some of these things
  // I guess the "onDidChangeSelection"? maybe???

  const scrollInEditor = () => {
    vscode.postMessage({
      command: 'scrollInEditor',
      id: anno.id
    });
  }

  const updateAnnotationContent = () => {
    setNewContent((document.getElementById('editContent') as HTMLInputElement).value);
  }

  const updateContent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    anno.annotation = newContent;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      newAnnoContent: anno.annotation
    });
    setNewContent("");
    setEdit(false);
  }

  const cancelAnnotation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setNewContent("");
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
          <div className={styles['Pad']} >
              <li key={annotation.id} className={styles['AnnotationContainer']}  >
                <div className={styles['IconContainer']}>
                  <AnnotationDropDown id={anno.id} editAnnotation={() => {setEdit(!edit)}} deleteAnnotation={(e) => deleteAnnotation(e)}/>
                </div>
                <div className={styles['AnchorContainer']} onClick={() => scrollInEditor()}>
                  <Syntax html={anno.html} />
                </div>
                <div className={styles['LocationContainer']} onClick={() => scrollInEditor()}>
                  {anno.visiblePath}: Line {anno.startLine + 1} to Line {anno.endLine + 1}
                </div>
                <div className={styles['ContentContainer']}>
                  {edit ? (
                    <React.Fragment>
                      <textarea value={newContent} onChange={updateAnnotationContent} id="editContent" />
                      <button className={styles['submit']} onClick={(e) => updateContent(e)}>Submit</button>
                      <button className={styles['cancel']} onClick={(e) => cancelAnnotation(e)}>Cancel</button>
                    </React.Fragment>
                  ) : (`${anno.annotation}`)}
                </div>
              </li>
            </div>
      </React.Fragment>
  )

}

export default ReactAnnotation;