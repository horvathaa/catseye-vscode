import * as React from 'react';
import UserProfile from './userProfile';
import AuthorOperationButtons from './authorOperationButtons';
import TextEditor from './textEditor';
import styles from '../../styles/annotation.module.css';

interface Props {
    id?: string | undefined,
    replyContent?: string | undefined,
    createdTimestamp: number,
    githubUsername: string,
    userId: string,
    deleted?: boolean,
    authorId: string,
    replying: boolean
    submissionHandler: (reply: {[key: string]: any}) => void
    cancelHandler: () => void;
    deleteHandler?: (id: string) => void;
}

const Reply : React.FC<Props> = ({ id = undefined, replyContent = undefined, createdTimestamp, githubUsername, userId, authorId, replying, deleted, submissionHandler, cancelHandler, deleteHandler }) => {
    const [editing, setEditing] = React.useState<boolean>(false);
    const [reply, setReply] = React.useState({
        id: id ? id : "",
        replyContent: replyContent ? replyContent : "",
        createdTimestamp: createdTimestamp,
        githubUsername,
        authorId,
        deleted: deleted ? deleted : false
    });

    React.useEffect(() => {
        if(replyContent && replyContent !== reply.replyContent) {
            setReply({ ...reply, replyContent: replyContent });
            setEditing(false);
        }
    }, [replyContent])

    const ReplyContent: React.ReactElement = (
        <div className={styles['replyContainer']}>
            <div className={styles['topRow']}>
                <UserProfile 
                    githubUsername={githubUsername}
                    createdTimestamp={createdTimestamp}
                />
                {authorId === userId && (
                    <div className={styles['buttonRow']}>
                        <AuthorOperationButtons editAnnotation={() => setEditing(!editing)} deleteAnnotation={() => { if(deleteHandler) deleteHandler(reply.id) }}/>
                    </div>
                )}
            </div>
            {replyContent}
        </div>
    )

    const ReplyEditor: React.ReactElement = (
        replying ? (
        <TextEditor 
            content={reply}
            submissionHandler={submissionHandler} 
            cancelHandler={cancelHandler}
        /> ) : (
        <TextEditor
            content={reply}
            submissionHandler={submissionHandler}
            cancelHandler={() => setEditing(false)}
        /> )
    )
    
    return (
        <div>
            {
                replying ? 
                (
                    ReplyEditor
                ) : editing ? 
                (
                    ReplyEditor
                ) :
                (
                    ReplyContent
                )
            }
        </div>
    )
}

export default Reply;