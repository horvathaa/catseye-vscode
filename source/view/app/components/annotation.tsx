import * as React from "react";
import cn from 'classnames';
import { buildAnnotation } from '../utils/viewUtils';
import styles from '../styles/annotation.module.css';
import { Annotation, AnchorObject, Reply, Snapshot } from '../../../constants/constants';
import AnnotationOperationButtons from './annotationComponents/annotationOperationButtons';
import AnchorList from './annotationComponents/anchorList';
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
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode, window, username, userId }) => {
  const [anno, setAnno] = React.useState<Annotation>(annotation);
  const [edit, setEdit] = React.useState<boolean>(false);
  const [replying, setReplying] = React.useState<boolean>(false);
  
  const annoRef: React.MutableRefObject<Annotation> = React.useRef(anno);

  const handleIncomingMessages = (e: MessageEvent<any>) => {
    const message = e.data;
    switch(message.command) {
      case 'newHtml':
        const { html, anchorText, anchorPreview, id, anchorId } = message.payload;
        if(id === anno.id) {
          const oldAnchorObject: AnchorObject | undefined = anno.anchors.find(a => a.anchorId === anchorId);
          if(oldAnchorObject) {
            const newAnchorList: AnchorObject[] = [ ...anno.anchors.filter(a => a.anchorId !== anchorId), { ...oldAnchorObject, html: html, anchorText: anchorText, anchorPreview: anchorPreview}]; 
            const newAnno: Annotation = buildAnnotation({ ...anno, anchors: newAnchorList });
            annoRef.current = newAnno;
            setAnno(newAnno);
          }
        }
        break;
      // case 'addTerminalMessage':
      //   if(anno.selected) {
      //     updateOutputs(message.payload.content);
      //   }
      //   break;
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

  const scrollInEditor = (id: string) : void => {
    vscode.postMessage({
      command: 'scrollInEditor',
      id: anno.id,
      anchorId: id
    });
  }

  const handleSelectedClick = () : void => {
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'selected',
      value: !anno.selected
    });
  }

  const exportAnnotationAsComment = () : void => {
    vscode.postMessage({
      command: 'exportAnnotationAsComment',
      annoId: anno.id
    });
  }

  const addAnchor = () : void => {
    vscode.postMessage({
      command: 'addAnchor',
      annoId: anno.id
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

  const snapshotCode = (id: string) : void => {
    vscode.postMessage({
      command: 'snapshotCode',
      annoId: anno.id,
      anchorId: id
    });
    const anchor: AnchorObject | undefined = anno.anchors.find(a => a.anchorId === id);
    if(!anchor) {
      console.error('could not find anchor - leaving annotation as is');
      return;
    }
    const newSnapshots: Snapshot[] = anno.codeSnapshots ? anno.codeSnapshots.concat([{ 
      createdTimestamp: new Date().getTime(), 
      snapshot: anchor.html,
      githubUsername: username,
      comment: "",
      id: "",
      deleted: false
    }]) : [{ 
      createdTimestamp: new Date().getTime(), 
      snapshot: anchor.html,
      githubUsername: username,
      comment: "",
      id: "",
      deleted: false
    }];
    const newAnno: Annotation = buildAnnotation({ ...anno, codeSnapshots: newSnapshots });
    setAnno(newAnno);
    annoRef.current = newAnno;
  }

  const submitReply = (reply: Reply) : void => {
    const replyIds: string[] = anno.replies?.map(r => r.id);
    const updatedReplies: Reply[] = replyIds.includes(reply.id) ? anno.replies.filter(r => r.id !== reply.id).concat([reply]) : anno.replies.concat([reply])
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

  const submitSnapshot = (snapshot: Snapshot) : void => {
    const updatedSnapshots: Snapshot[] = anno.codeSnapshots.map((s: Snapshot) => {
      return s.id === snapshot.id ? snapshot : s
    });
    const newAnno: Annotation = buildAnnotation({ ...anno, codeSnapshots: updatedSnapshots });
    setAnno(newAnno);
    annoRef.current = newAnno;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'codeSnapshots',
      value: updatedSnapshots
    });
  }

  const deleteSnapshot = (id: string) : void => {
    const updatedSnapshots = anno.codeSnapshots.map((s: Snapshot) => {
      return s.id === id ? { ...s, deleted: true } : s
    });
    const newAnno: Annotation = buildAnnotation({ ...anno, codeSnapshots: updatedSnapshots });
    setAnno(newAnno);
    annoRef.current = newAnno;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: 'codeSnapshots',
      value: updatedSnapshots
    });
  }
  
  const updateContent = (newAnnoContent: string, shareWith: string | undefined) : void => {
    const newAnno: Annotation = buildAnnotation({ ...anno, annotation: newAnnoContent, shareWith });
    setAnno(newAnno);
    annoRef.current = newAnno;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      key: ['annotation', 'sharedWith'],
      value: { annotation: newAnnoContent, sharedWith: shareWith }
    });
    setEdit(false);
  }



  return (
      <React.Fragment>
          <div key={'annotation-container'+annotation.id} className={styles['Pad']}  >
              <li key={'annotation-li'+annotation.id} id={annotation.id} className={cn({ [styles.selected]: anno.selected, [styles.AnnotationContainer]: true })} >
                <div className={styles['topRow']}>
                  <UserProfile 
                    githubUsername={anno.githubUsername} 
                    createdTimestamp={anno.createdTimestamp} 
                  />
                  <AnnotationOperationButtons
                    annotationId={anno.id}
                    userId={userId}
                    authorId={anno.authorId}
                    replyToAnnotation={() => { setReplying(!replying) }}
                    exportAnnotationAsComment={exportAnnotationAsComment}
                    editAnnotation={() => { setEdit(!edit) }} 
                    deleteAnnotation={(e) => deleteAnnotation(e)}
                    pinAnnotation={handleSelectedClick}
                    addAnchor={addAnchor}
                    pinned={anno.selected}
                  />
                </div>
                <AnchorList 
                  anchors={anno.anchors}
                  snapshotCode={snapshotCode}
                  scrollInEditor={scrollInEditor}
                />
                <div className={styles['ContentContainer']}>
                  {edit ? (
                    <TextEditor 
                      content={anno.annotation} 
                      submissionHandler={updateContent} 
                      cancelHandler={cancelAnnotation}
                      showSplitButton={true}
                    />
                  ) : (`${anno.annotation}`)}
                </div>
                <Snapshots 
                  snapshots={anno.codeSnapshots}
                  githubUsername={username}
                  deleteHandler={deleteSnapshot}
                  submissionHandler={submitSnapshot}
                />
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
