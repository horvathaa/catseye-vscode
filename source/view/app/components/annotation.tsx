import * as React from "react";
import cn from 'classnames';
import { buildAnnotation } from '../utils/viewUtils';
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import AnnotationOperationButtons from './annotationComponents/annotationOperationButtons';
import Anchor from './annotationComponents/anchor';
import TextEditor from "./annotationComponents/textEditor";
import UserProfile from "./annotationComponents/userProfile";
import ReplyContainer from './annotationComponents/replyContainer';
import Outputs from './annotationComponents/outputs';
import Snapshots from './annotationComponents/snapshots';
interface Props {
  annotation: Annotation;
  vscode: any;
  window: Window;
  username: string;
  userId: string;
  initialSelected: boolean;
  transmitSelected: (id: string) => void;
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode, window, username, userId, initialSelected, transmitSelected }) => {
  const [anno, setAnno] = React.useState<Annotation>(annotation);
  const [edit, setEdit] = React.useState<boolean>(false);
  const [replying, setReplying] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<boolean>(initialSelected);

  const selectedRef: React.MutableRefObject<boolean> = React.useRef(selected);
  const annoRef: React.MutableRefObject<Annotation> = React.useRef(anno);

  const handleIncomingMessages = (e: MessageEvent<any>) => {
    const message = e.data;
    switch(message.command) {
      case 'newHtml':
        const { html, anchorText, anchorPreview, id } = message.payload;
        if(id === anno.id) {
          const newAnno: Annotation = buildAnnotation({ ...anno, html: html, anchorText: anchorText, anchorPreview: anchorPreview});
          annoRef.current = newAnno;
          setAnno(newAnno);
        }
        break;
      case 'addTerminalMessage':
        if(selectedRef.current) {
          updateOutputs(message.payload.content);
        }
        break;
    }
  }

  React.useEffect(() => {
    window.addEventListener('message', handleIncomingMessages);
    return () => {
      window.removeEventListener('message', handleIncomingMessages);
    }
  }, []);

  React.useEffect(() => {
    if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
      const newAnno: Annotation = buildAnnotation(annotation);
      setAnno(newAnno);
      annoRef.current = newAnno;
    }
  }, [annotation]);

  const scrollInEditor = () : void => {
    vscode.postMessage({
      command: 'scrollInEditor',
      id: anno.id
    });
  }

  const handleSelectedClick = () : void => {
    selectedRef.current = !selected;
    transmitSelected(anno.id);
    setSelected(!selected);
  }

  const exportAnnotationAsComment = () : void => {
    vscode.postMessage({
      command: 'exportAnnotationAsComment',
      annoId: anno.id
    });
  }

  const submitReply = (reply: {[key: string] : any}) : void => {
    const replyIds: string[] = anno.replies?.map(r => r.id);
    const updatedReplies: {[key: string]: any}[] = replyIds.includes(reply.id) ? anno.replies.filter(r => r.id !== reply.id).concat([reply]) : anno.replies.concat([reply])
    const newAnno: Annotation = buildAnnotation({ ...anno, replies: updatedReplies });
    setAnno(newAnno);
    annoRef.current = newAnno;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'replies',
      value: updatedReplies
    });
    setReplying(false); 
  }

  const deleteReply = (id: string) : void => {
    const updatedReply = { ...anno.replies.filter(r => r.id === id)[0], deleted: true }
    const updatedReplies = anno.replies.filter(r => r.id !== id).concat([updatedReply])
    const newAnno: Annotation = buildAnnotation({ ...anno, replies: updatedReplies });
    setAnno(newAnno);
    annoRef.current = newAnno;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'replies',
      value: updatedReplies
    });
  }
  
  const updateContent = (newAnnoContent: string) : void => {
    const newAnno: Annotation = buildAnnotation({ ...anno, annotation: newAnnoContent });
    setAnno(newAnno);
    annoRef.current = newAnno;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'annotation',
      value: newAnnoContent
    });
    setEdit(false);
  }

  const updateOutputs = (outputContent: string) : void => {
    const newOutput: {[key: string]: any} = { message: outputContent, timestamp: new Date().getTime(), codeAtTime: annoRef.current.html };
    const newOutputs: {[key: string]: any}[] = annoRef.current.outputs && annoRef.current.outputs.length ? annoRef.current.outputs.concat([newOutput]) : [newOutput];
    const newAnno: Annotation = buildAnnotation({ ...anno, outputs: newOutputs });
    annoRef.current = newAnno;
    setAnno(newAnno);
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'outputs',
      value: newOutputs
    });
  }

  const cancelAnnotation = () : void => {
    setEdit(false);
  }

  const deleteAnnotation = (e: React.SyntheticEvent) : void => {
    e.stopPropagation();
    vscode.postMessage({
      command: 'deleteAnnotation',
      annoId: anno.id,
    });
  }

  const snapshotCode = (e: React.SyntheticEvent) : void => {
    e.stopPropagation();
    vscode.postMessage({
      command: 'snapshotCode',
      annoId: anno.id
    });
    const newAnno: Annotation = buildAnnotation({ ...anno, codeSnapshots: anno.codeSnapshots ? anno.codeSnapshots.concat([{ createdTimestamp: new Date().getTime(), snapshot: anno.html }]) : [{ createdTimestamp: new Date().getTime(), snapshot: anno.html }] });
    setAnno(newAnno);
    annoRef.current = newAnno;
  }

  return (
      <React.Fragment>
          <div key={'annotation-container'+annotation.id} className={styles['Pad']} id={annotation.id} >
              <li key={'annotation-li'+annotation.id} className={cn({ [styles.selected]: selected, [styles.AnnotationContainer]: true })} onClick={handleSelectedClick} >
                <div className={styles['topRow']}>
                  <UserProfile 
                    githubUsername={anno.githubUsername} 
                    createdTimestamp={anno.createdTimestamp} 
                  />
                  <AnnotationOperationButtons
                    userId={userId}
                    authorId={anno.authorId}
                    replyToAnnotation={() => { setReplying(!replying) }}
                    exportAnnotationAsComment={exportAnnotationAsComment}
                    editAnnotation={() => { setEdit(!edit) }} 
                    deleteAnnotation={(e) => deleteAnnotation(e)}
                    snapshotCode={snapshotCode}
                  />
                </div>
                <Anchor 
                  html={anno.html} 
                  anchorPreview={anno.anchorPreview} 
                  visiblePath={anno.visiblePath}
                  startLine={anno.startLine}
                  endLine={anno.endLine}
                  scrollInEditor={scrollInEditor}
                  originalCode={anno.originalCode}
                />
                <div className={styles['ContentContainer']}>
                  {edit ? (
                    <TextEditor 
                      content={anno.annotation} 
                      submissionHandler={updateContent} 
                      cancelHandler={cancelAnnotation}
                    />
                  ) : (`${anno.annotation}`)}
                </div>
                <Snapshots snapshots={anno.codeSnapshots} />
                <Outputs 
                  outputs={anno.outputs} 
                  id={anno.id} 
                />
                <ReplyContainer 
                  replying={replying}
                  replies={anno.replies}
                  username={username}
                  userId={userId}
                  submitReply={submitReply}
                  cancelReply={() => setReplying(false)}
                  deleteReply={deleteReply}
                />
                  
              </li>
            </div>
      </React.Fragment>
  )

}

export default ReactAnnotation;