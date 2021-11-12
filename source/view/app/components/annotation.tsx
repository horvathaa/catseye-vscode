import * as React from "react";
import { buildAnnotation } from '../viewUtils';
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import AnnotationOperationButtons from './annotationComponents/annotationOperationButtons';
import Anchor from './annotationComponents/anchor';
import TextEditor from "./annotationComponents/textEditor";
import UserProfile from "./annotationComponents/userProfile";
import ReplyContainer from './annotationComponents/replyContainer';
interface Props {
  annotation: Annotation;
  vscode: any;
  window: Window;
  username: string;
  userId: string;
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode, window, username, userId }) => {
  const [anno, setAnno] = React.useState(annotation);
  const [edit, setEdit] = React.useState(false);
  const [replying, setReplying] = React.useState(false);

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
      window.removeEventListener('message', handleIncomingMessages);
    }
  }, []);

  React.useEffect(() => {
    if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
      setAnno(buildAnnotation(annotation));
    }
  }, [annotation]);

  const scrollInEditor = () : void => {
    vscode.postMessage({
      command: 'scrollInEditor',
      id: anno.id
    });
  }

  const submitReply = (reply: {[key: string] : any}) : void => {
    const replyIds: string[] = anno.replies?.map(r => r.id);
    const updatedReplies: {[key: string]: any}[] = replyIds.includes(reply.id) ? anno.replies.filter(r => r.id !== reply.id).concat([reply]) : anno.replies.concat([reply])
    setAnno({ ...anno, replies: updatedReplies })
    vscode.postMessage({
      command: 'updateReplies',
      annoId: anno.id,
      replies: updatedReplies
    });
    setReplying(false); 
  }

  const deleteReply = (id: string) : void => {
    const updatedReply = { ...anno.replies.filter(r => r.id === id)[0], deleted: true}
    const updatedReplies = anno.replies.filter(r => r.id !== id).concat([updatedReply])
    setAnno({ ...anno, replies: updatedReplies });
    vscode.postMessage({
      command: 'updateReplies',
      annoId: anno.id,
      replies: updatedReplies
    });
  }
  
  const updateContent = (newAnnoContent: string) : void => {
    setAnno({ ...anno, annotation: newAnnoContent });
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      newAnnoContent: newAnnoContent
    });
    setEdit(false);
  }

  const cancelAnnotation = () : void => {
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
                  <AnnotationOperationButtons
                    userId={userId}
                    authorId={anno.authorId}
                    replyToAnnotation={() => { setReplying(!replying) }}
                    editAnnotation={() => { setEdit(!edit) }} 
                    deleteAnnotation={(e) => deleteAnnotation(e)}
                  />
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
                      content={anno.annotation} 
                      submissionHandler={updateContent} 
                      cancelHandler={cancelAnnotation}
                    />
                  ) : (`${anno.annotation}`)}
                </div>
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