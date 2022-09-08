/*
 *
 * reply.tsx
 * Component which contains all reply-related content, including textEditor to create a new reply,
 * and the list of replies the user has already made
 *
 */
import * as React from 'react'
import UserProfile from './userProfile'
import AuthorOperationButtons from './authorOperationButtons'
import TextEditor from './textEditor'
import styles from '../../styles/annotation.module.css'
import { Reply as ReplyInterface } from '../../../../constants/constants'
import cn from 'classnames'

interface Props {
    id?: string | undefined
    replyContent?: string | undefined
    lastEditTime?: number | undefined
    createdTimestamp: number
    githubUsername?: string
    userId?: string
    deleted?: boolean
    authorId: string
    replying: boolean
    submissionHandler?: (reply: ReplyInterface) => void
    cancelHandler: () => void
    deleteHandler?: (id: string) => void
    focus?: boolean
    lastItem?: boolean
}

export const Reply: React.FC<Props> = ({
    id = undefined,
    replyContent = undefined,
    createdTimestamp,
    githubUsername = undefined,
    userId = undefined,
    authorId,
    replying,
    deleted,
    lastEditTime = undefined,
    submissionHandler = undefined,
    cancelHandler,
    deleteHandler = undefined,
    focus,
    lastItem = false,
}) => {
    const [editing, setEditing] = React.useState<boolean>(false)
    const [reply, setReply] = React.useState({
        id: id ? id : '',
        replyContent: replyContent ? replyContent : '',
        createdTimestamp: createdTimestamp,
        githubUsername,
        authorId,
        deleted: deleted ? deleted : false,
        lastEditTime: lastEditTime ? lastEditTime : createdTimestamp,
    })

    React.useEffect(() => {
        if (replyContent && replyContent !== reply.replyContent) {
            setReply({ ...reply, replyContent })
            setEditing(false)
        }
    }, [replyContent])

    React.useEffect(() => {
        if (id && id !== reply.id) {
            setReply({ ...reply, id })
        }
    }, [id])

    const createReply = (replyFromCallback: ReplyInterface): void => {
        if (submissionHandler) {
            const { replyContent } = replyFromCallback
            const replyToSend = {
                ...reply,
                replyContent,
                createdTimestamp,
                githubUsername: githubUsername ? githubUsername : '',
            }
            replyToSend && submissionHandler(replyToSend)
        }
    }

    const ReplyContent: React.ReactElement = (
        <div
            className={cn({
                [styles['replyContainer']]: true,
                [styles['lastItem']]: lastItem,
            })}
        >
            <div className={styles['topRow']}>
                <UserProfile
                    githubUsername={githubUsername ? githubUsername : ''}
                    createdTimestamp={createdTimestamp}
                    lastEditTime={
                        lastEditTime
                            ? lastEditTime
                            : reply.lastEditTime
                            ? reply.lastEditTime
                            : new Date().getTime()
                    }
                />
                {authorId === userId && (
                    <div className={styles['buttonRow']}>
                        <AuthorOperationButtons
                            editAnnotation={() => setEditing(!editing)}
                            deleteAnnotation={() => {
                                if (deleteHandler) deleteHandler(reply.id)
                            }}
                        />
                    </div>
                )}
            </div>
            <div className={styles['replyContentContainer']}>
                {reply.replyContent}
            </div>
        </div>
    )
    // Ideally createdTimestamp is updated on Submit for creation (might be happening)
    const ReplyEditor: React.ReactElement | null = replying ? (
        <TextEditor
            content={reply}
            submissionHandler={createReply}
            cancelHandler={cancelHandler}
            showSplitButton={false}
            showCancel={false}
            focus={focus}
            placeholder={'Add reply'}
        />
    ) : submissionHandler ? (
        // This shouldn't update created Timestamp, maybe have a new edit time field though
        <TextEditor
            content={reply}
            submissionHandler={(content) => {
                submissionHandler(content)
                setEditing(false)
            }}
            cancelHandler={() => setEditing(false)}
            showSplitButton={false}
        />
    ) : null

    return (
        <div style={{ width: `100%` }}>
            {replying ? ReplyEditor : editing ? ReplyEditor : ReplyContent}
        </div>
    )
}
