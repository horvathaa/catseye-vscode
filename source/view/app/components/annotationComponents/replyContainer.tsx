/*
 *
 * replyContainer.tsx
 * Component which contains all reply-related content, including textEditor to create a new reply,
 * and the list of replies the user has already made
 *
 */
import * as React from 'react'
import { Reply as ReactReply } from './reply' // reply component
import { showHideLine } from '../../utils/viewUtilsTsx'
import { Reply, ReplyMergeInformation } from '../../../../constants/constants' // reply data model
import styles from '../../styles/annotation.module.css'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp'
import Tooltip from '@mui/material/Tooltip/Tooltip'

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
    handleSelectReply?: (id: string, operation: string, level?: string) => void
    mergeInformation?: ReplyMergeInformation[]
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
    mergeInformation,
}) => {
    const [showMoreReplies, setShowMoreReplies] = React.useState<boolean>(false)
    const activeReplies = replies.filter((r) => !r.deleted)
    const mostRecentReplies = activeReplies.slice(-MAX_NUM_REPLIES)
    const hasReplies = replies && activeReplies.length
    const [tempIdCounter, setTempIdCounter] = React.useState<number>(1)
    const [hasBeenSelected, setHasBeenSelected] = React.useState<
        Map<string, boolean>
    >(new Map())

    React.useEffect(() => {
        let map = new Map()
        if (mergeInformation) {
            mergeInformation.forEach((r) => {
                // if the reply appears in the mergeInformation, it must be in use
                // which means it has been selected
                map.set(r.id, true)
            })
        }
        setHasBeenSelected(map)
    }, [mergeInformation])

    React.useEffect(() => {}, [replies])

    const createReply = (reply: Reply): void => {
        submitReply && submitReply(reply)
        setTempIdCounter(tempIdCounter + 1)
    }

    const showSelection = (r: Reply): React.ReactElement => {
        if (hasBeenSelected.get(r.id)) {
            return (
                <div className={styles['ReplyArrowBox']}>
                    <Tooltip title={'Remove reply from merged annotation'}>
                        <ArrowDownwardIcon
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setHasBeenSelected(
                                    new Map(hasBeenSelected.set(r.id, false))
                                )
                                handleSelectReply &&
                                    handleSelectReply(r.id, 'remove')
                            }}
                        />
                    </Tooltip>
                </div>
            )
        } else {
            return (
                <div className={styles['ReplyArrowBox']}>
                    <Tooltip title={'Add reply to merged annotation body'}>
                        <KeyboardDoubleArrowUpIcon
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setHasBeenSelected(
                                    new Map(hasBeenSelected.set(r.id, true))
                                )
                                handleSelectReply &&
                                    handleSelectReply(r.id, 'add', 'annotation')
                            }}
                        />
                    </Tooltip>
                    <Tooltip title={'Add reply to merged annotation'}>
                        <ArrowUpwardIcon
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setHasBeenSelected(
                                    new Map(hasBeenSelected.set(r.id, true))
                                )
                                handleSelectReply &&
                                    handleSelectReply(r.id, 'add', 'reply')
                            }}
                        />
                    </Tooltip>
                </div>
            )
        }
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
                      (r: Reply, i: number, arr: Reply[]) => {
                          return !r.deleted ? (
                              <div
                                  key={'reply-div-' + r.id}
                                  style={{
                                      display: 'flex',
                                      flexDirection: 'row',
                                  }}
                              >
                                  {showCheckbox && showSelection(r)}
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
                                      lastItem={i === arr.length - 1}
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
                    authorId={userId ?? ''}
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
