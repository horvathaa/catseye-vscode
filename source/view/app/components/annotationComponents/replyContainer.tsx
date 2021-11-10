import * as React from 'react';
import Reply from './reply';
import { BiCaretUpSquare, BiCaretDownSquare } from 'react-icons/bi';
import styles from '../../styles/annotation.module.css';

interface Props {
    replying: boolean;
    replies: {[key: string]: any}[];
    username: string;
    userId: string;
    submitReply: (reply: {[key: string]: any}) => void;
    cancelReply: () => void;
}

const ReplyContainer: React.FC<Props> = ({ replying, replies, username, userId, submitReply, cancelReply }) => {
    const [showingReplies, setShowingReplies] = React.useState(false);
    
    const collapseExpandToggle = () :  React.ReactElement<any> => {
        const replyString: string = showingReplies ? `Hide ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` :
            `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
        const icon: React.ReactElement<any> = !showingReplies ? 
            ( <BiCaretDownSquare onClick={() => setShowingReplies(true)} className={styles['IconContainer']} /> ) : 
            (<BiCaretUpSquare onClick={() => setShowingReplies(false)} className={styles['IconContainer']} /> )
        return (
            <div className={styles['replyShowHide']}>
                {replyString} {icon}
            </div>
        )
    }

    const hasReplies = replies && replies.length;

    return (
        <div>
            {replying && 
                <Reply
                    githubUsername={username}
                    authorId={userId}
                    replying={replying}
                    createdTimestamp={new Date().getTime()}
                    submissionHandler={submitReply}
                    cancelHandler={cancelReply}
                />
            }
            {hasReplies ? collapseExpandToggle() : (null)}
            {showingReplies && hasReplies && replies?.map((r: {[key: string] : any }) => {
                return (
                    <Reply 
                        id={r.id}
                        replyContent={r.replyContent}
                        authorId={r.authorId}
                        githubUsername={r.githubUsername}
                        createdTimestamp={r.createdTimestamp}
                        replying={false}
                        submissionHandler={submitReply}
                        cancelHandler={cancelReply}
                    />
                )
            })}
        </div>
    )
}

export default ReplyContainer;