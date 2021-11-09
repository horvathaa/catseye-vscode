import * as React from 'react';
import UserProfile from './userProfile';
import TextEditor from './textEditor';
import styles from '../../styles/annotation.module.css';

interface Props {
    id?: string | undefined,
    replyContent?: string | undefined,
    createdTimestamp: number,
    githubUsername: string,
    authorId: string,
    replying: boolean
    submissionHandler: (reply: {[key: string]: any}) => void
    cancelHandler: () => void
}

const Reply : React.FC<Props> = ({ id = undefined, replyContent = undefined, createdTimestamp, githubUsername, authorId, replying, submissionHandler, cancelHandler }) => {
    const [editing, setEditing] = React.useState(false);

    const reply = {
        id: id ? id : "",
        replyContent: replyContent ? replyContent : "",
        createdTimestamp: createdTimestamp,
        githubUsername,
        authorId
    };

    const ReplyContent: React.ReactElement = (
        <div className={styles['replyContainer']}>
            <UserProfile 
                githubUsername={githubUsername}
                createdTimestamp={createdTimestamp}
            />
            {replyContent}
        </div>
    )

    const ReplyEditor: React.ReactElement = (
        <TextEditor 
            content={reply}
            submissionHandler={submissionHandler} 
            cancelHandler={cancelHandler}
        />
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