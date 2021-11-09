import * as React from "react";
import { buildAnnotation } from '../viewUtils';
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import AnnotationDropDown from './annotationComponents/annotationMenu';
import Anchor from './annotationComponents/anchor';
import TextEditor from "./annotationComponents/textEditor";
import UserProfile from "./annotationComponents/userProfile";
import Reply from './annotationComponents/reply';
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
      window.removeEventListener('message', handleIncomingMessages)
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
    setAnno({...anno, replies: updatedReplies })
    vscode.postMessage({
      command: 'updateReplies',
      annoId: anno.id,
      replies: updatedReplies
    });
    setReplying(false); 
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
                  <div className={styles['IconContainer']}>
                    <AnnotationDropDown 
                      id={anno.id}
                      replyToAnnotation={() => { setReplying(!replying) }}
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
                      content={anno.annotation} 
                      submissionHandler={updateContent} 
                      cancelHandler={cancelAnnotation}
                    />
                  ) : (`${anno.annotation}`)}
                </div>
                <div>
                  {replying && 
                    <Reply
                      githubUsername={username}
                      authorId={userId}
                      replying={replying}
                      createdTimestamp={new Date().getTime()}
                      submissionHandler={submitReply}
                      cancelHandler={ () => setReplying(false) }
                    />
                  }
                  {anno.replies?.map((r: {[key: string] : any }) => {
                    return (
                      <li key={r.id}>
                        <Reply 
                          id={r.id}
                          replyContent={r.replyContent}
                          authorId={r.authorId}
                          githubUsername={r.githubUsername}
                          createdTimestamp={r.createdTimestamp}
                          replying={false}
                          submissionHandler={submitReply}
                          cancelHandler={ () => setReplying(false) }
                        />
                      </li>
                    )
                  })}
                </div>
              </li>
            </div>
      </React.Fragment>
  )

}

export default ReactAnnotation;