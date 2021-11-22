import * as React from 'react';
import Reply from './reply';
import { collapseExpandToggle } from '../../utils/viewUtilsTsx';

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
    const [showingReplies, setShowingReplies] = React.useState<boolean>(false);
    const activeReplies = replies.filter(r => !r.deleted);
    const hasReplies = replies && activeReplies.length;

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
            {hasReplies ? collapseExpandToggle(showingReplies, activeReplies, setShowingReplies, 'reply') : (null)}
            {showingReplies && hasReplies && replies?.map((r: {[key: string] : any }) => {
                return (
                    !r.deleted ?
                    <Reply
                        key={'reply-' + r.id}
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