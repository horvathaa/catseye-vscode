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
    deleteReply: (id: string) => void;
}

const ReplyContainer: React.FC<Props> = ({ replying, replies, username, userId, submitReply, cancelReply, deleteReply }) => {
    const [showingReplies, setShowingReplies] = React.useState(false);
    const numberActiveReplies = replies.filter(r => !r.deleted).length
    const hasReplies = replies && numberActiveReplies;
    
    const collapseExpandToggle = () :  React.ReactElement<any> => {
        const replyString: string = showingReplies ? `Hide ${numberActiveReplies} ${numberActiveReplies === 1 ? 'reply' : 'replies'}` :
            `Show ${numberActiveReplies} ${numberActiveReplies === 1 ? 'reply' : 'replies'}`
        const icon: React.ReactElement<any> = !showingReplies ? 
            ( <BiCaretDownSquare onClick={() => setShowingReplies(true)} className={styles['IconContainer']} /> ) : 
            (<BiCaretUpSquare onClick={() => setShowingReplies(false)} className={styles['IconContainer']} /> )
        return (
            <div className={styles['replyShowHide']}>
                {replyString} {icon}
            </div>
        )
    }

    return (
        <div>
            {replying && 
                <Reply
                    githubUsername={username}
                    authorId={userId}
                    userId={userId}
                    replying={replying}
                    createdTimestamp={new Date().getTime()}
                    submissionHandler={submitReply}
                    cancelHandler={cancelReply}
                />
            }
            {hasReplies ? collapseExpandToggle() : (null)}
            {showingReplies && hasReplies && replies?.map((r: {[key: string] : any }) => {
                return (
                    !r.deleted ?
                    <Reply 
                        id={r.id}
                        replyContent={r.replyContent}
                        userId={userId}
                        authorId={r.authorId}
                        githubUsername={r.githubUsername}
                        createdTimestamp={r.createdTimestamp}
                        replying={false}
                        deleted={r.deleted}
                        submissionHandler={submitReply}
                        cancelHandler={cancelReply}
                        deleteHandler={deleteReply}
                    /> : (null)
                )
            })}
        </div>
    )
}

export default ReplyContainer;