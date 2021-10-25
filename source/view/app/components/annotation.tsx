import * as React from "react";
import * as vscode from 'vscode';
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import { useEffect } from "react";
import AnnotationDropDown from './annotationComponents/annotationMenu';
import Anchor from './annotationComponents/anchor';

const buildAnnotation = (annoInfo: any, range: vscode.Range | undefined = undefined) : Annotation => {
	const annoObj : { [key: string]: any } = range ? 
	{
		startLine: range.start.line,
		endLine: range.end.line,
		startOffset: range.start.character,
		endOffset: range.end.character,
		...annoInfo
	} : annoInfo.anchor ? {
		startLine: annoInfo.anchor.startLine,
		endLine: annoInfo.anchor.endLine,
		startOffset: annoInfo.anchor.startOffset,
		endOffset: annoInfo.anchor.endOffset,
		...annoInfo
	} : annoInfo;

	return new Annotation(
		annoObj['id'], 
		annoObj['filename'], 
		annoObj['visiblePath'], 
		annoObj['anchorText'],
		annoObj['annotation'],
		annoObj['startLine'],
		annoObj['endLine'],
		annoObj['startOffset'],
		annoObj['endOffset'],
		annoObj['deleted'],
		annoObj['outOfDate'],
		annoObj['html'],
		annoObj['authorId'],
		annoObj['createdTimestamp'],
		annoObj['programmingLang'],
		annoObj['gitRepo'],
		annoObj['gitBranch'],
		annoObj['gitCommit'],
    annoObj['anchorPreview']
	)
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

  useEffect(() => {
    window.addEventListener('message', handleIncomingMessages);
    return () => {
      window.removeEventListener('message', handleIncomingMessages)
    }
  }, []);

  useEffect(() => {
    if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
      setAnno(annotation);
    }
  }, [annotation]);

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
          <div className={styles['Pad']} id={annotation.id} >
              <li key={annotation.id} className={styles['AnnotationContainer']}  >
                <div className={styles['IconContainer']}>
                  <AnnotationDropDown id={anno.id} editAnnotation={() => {setEdit(!edit)}} deleteAnnotation={(e) => deleteAnnotation(e)}/>
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
                    <React.Fragment>
                      <textarea className={styles['textbox']} value={newContent} onChange={updateAnnotationContent} id="editContent" />
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