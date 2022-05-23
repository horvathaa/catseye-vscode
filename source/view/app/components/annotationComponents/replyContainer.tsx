/*
 *
 * replyContainer.tsx
 * Component which contains all reply-related content, including textEditor to create a new reply,
 * and the list of replies the user has already made
 *
 */
import * as React from 'react';
import { Reply as ReactReply } from './reply'; // reply component
import { collapseExpandToggle } from '../../utils/viewUtilsTsx';
import { Reply } from '../../../../constants/constants'; // reply data model

interface Props {
    replying: boolean;
    replies: Reply[];
    username: string;
    userId: string;
    submitReply: (reply: Reply) => void;
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
                <ReactReply
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
            {showingReplies && hasReplies ? replies?.map((r: Reply) => {
                return (
                    !r.deleted ?
                    <ReactReply
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
            }) : (null)}
        </div>
    )
}

export default ReplyContainer;