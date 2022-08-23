/*
 *
 * replyContainer.tsx
 * Component which contains all reply-related content, including textEditor to create a new reply,
 * and the list of replies the user has already made
 *
 */
import * as React from 'react'
import { Reply as ReactReply } from './reply' // reply component
import { collapseExpandToggle, showHideLine } from '../../utils/viewUtilsTsx'
import { Reply } from '../../../../constants/constants' // reply data model
import styles from '../../styles/annotation.module.css'
import { Checkbox } from '@mui/material'

interface Props {
    replying: boolean
    replies: Reply[]
    username?: string
    userId?: string
    submitReply?: (reply: Reply) => void
    cancelReply: () => void
    deleteReply?: (id: string) => void
    focus?: boolean
    showCheckbox?: boolean
    handleSelectReply?: (id: string) => void
}

const MAX_NUM_REPLIES = 3

const ReplyContainer: React.FC<Props> = ({
    replying,
    replies,
    username = undefined,
    userId = undefined,
    submitReply = undefined,
    cancelReply,
    deleteReply = undefined,
    focus = true,
    showCheckbox = false,
    handleSelectReply,
}) => {
    const [showMoreReplies, setShowMoreReplies] = React.useState<boolean>(false)
    const activeReplies = replies.filter((r) => !r.deleted)
    const mostRecentReplies = activeReplies.slice(-MAX_NUM_REPLIES)
    const hasReplies = replies && activeReplies.length
    const [tempIdCounter, setTempIdCounter] = React.useState<number>(1)

    const createReply = (reply: Reply): void => {
        submitReply && submitReply(reply)
        setTempIdCounter(tempIdCounter + 1)
    }

    return (
        <div className={styles['ContentContainer']}>
            {hasReplies && MAX_NUM_REPLIES < activeReplies.length
                ? showHideLine(
                      showMoreReplies,
                      activeReplies.length - MAX_NUM_REPLIES,
                      setShowMoreReplies,
                      'reply'
                  )
                : null}
            {hasReplies
                ? (showMoreReplies ? activeReplies : mostRecentReplies)?.map(
                      (r: Reply) => {
                          return !r.deleted ? (
                              <div
                                  key={'reply-div-' + r.id}
                                  style={{
                                      display: 'flex',
                                      flexDirection: 'row',
                                  }}
                              >
                                  {/* Amber: Why do we have this? What is this supposed to do? */}
                                  {showCheckbox && (
                                      <Checkbox
                                          // Needs work
                                          onChange={() =>
                                              handleSelectReply(r.id)
                                          }
                                          inputProps={{
                                              'aria-label': 'controlled',
                                          }}
                                      />
                                  )}
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
                                  />
                              </div>
                          ) : null
                      }
                  )
                : null}
            {replying && (
                <ReactReply
                    githubUsername={username}
                    id={`temp-${tempIdCounter}`}
                    authorId={userId}
                    userId={userId}
                    replying={true}
                    createdTimestamp={new Date().getTime()}
                    submissionHandler={createReply}
                    cancelHandler={cancelReply}
                    focus={focus}
                />
            )}
        </div>
    )
}

export default ReplyContainer
