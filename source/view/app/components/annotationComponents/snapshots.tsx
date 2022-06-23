/*
 *
 * snapshots.tsx
 * Components for showcasing versions of code.
 * Would like to add diff support.
 *
 */
import * as React from 'react'
import {
    AnchorObject,
    Snapshot as SnapshotInterface,
} from '../../../../constants/constants'
import { Syntax } from './anchor'
// import { parseDiff, Diff, Hunk } from 'react-diff-view';

import UserProfile from './userProfile'
import AuthorOperationButtons from './authorOperationButtons'
import TextEditor from './textEditor'
import styles from '../../styles/annotation.module.css'
import { collapseExpandToggle } from '../../utils/viewUtilsTsx'

interface SnapshotProps {
    snapshot: SnapshotInterface
    currentCode: string | undefined
    githubUsername: string
    deleteHandler: (id: string) => void
    submissionHandler: (snapshot: SnapshotInterface) => void
}

export const Snapshot: React.FC<SnapshotProps> = ({
    snapshot,
    currentCode,
    githubUsername,
    deleteHandler,
    submissionHandler,
}) => {
    const [editing, setEditing] = React.useState<boolean>(false)
    return (
        <div className={styles['replyContainer']}>
            <div className={styles['topRow']}>
                <UserProfile
                    githubUsername={snapshot.githubUsername}
                    createdTimestamp={snapshot.createdTimestamp}
                />
                {githubUsername === snapshot.githubUsername && (
                    <div className={styles['buttonRow']}>
                        <AuthorOperationButtons
                            editAnnotation={() => setEditing(!editing)}
                            deleteAnnotation={() => {
                                if (deleteHandler) deleteHandler(snapshot.id)
                            }}
                        />
                    </div>
                )}
            </div>
            <div className={styles['snapshotContainer']}>
                <Syntax html={snapshot.snapshot} />
            </div>
            {/* <ReactDiffViewer 
                oldValue={snapshot.anchorText}
                newValue={currentCode ? currentCode : ""}
                splitView={true}
            /> */}
            {editing ? (
                <TextEditor
                    content={snapshot}
                    submissionHandler={submissionHandler}
                    cancelHandler={() => setEditing(false)}
                    showSplitButton={false}
                />
            ) : (
                `${snapshot.comment}`
            )}
        </div>
    )
}

interface Props {
    snapshots: SnapshotInterface[]
    anchors: AnchorObject[]
    githubUsername: string
    deleteHandler: (id: string) => void
    submissionHandler: (snapshot: SnapshotInterface) => void
}

const Snapshots: React.FC<Props> = ({
    snapshots,
    anchors,
    githubUsername,
    submissionHandler,
    deleteHandler,
}) => {
    const [showingSnapshots, setShowingSnapshots] =
        React.useState<boolean>(false)
    const activeSnapshots: SnapshotInterface[] = snapshots.filter(
        (s) => !s.deleted
    )

    return (
        <div className={styles['outerSnapshotContainer']}>
            {activeSnapshots && activeSnapshots.length
                ? collapseExpandToggle(
                      showingSnapshots,
                      activeSnapshots,
                      setShowingSnapshots,
                      'snapshot'
                  )
                : null}
            {showingSnapshots &&
                activeSnapshots.map((s: SnapshotInterface) => {
                    return (
                        <Snapshot
                            key={'snapshot-' + s.id}
                            snapshot={s}
                            currentCode={
                                anchors.find((a) => a.anchorId === s.anchorId)
                                    ?.anchorText
                            }
                            githubUsername={githubUsername}
                            submissionHandler={submissionHandler}
                            deleteHandler={deleteHandler}
                        />
                    )
                })}
        </div>
    )
}

export default Snapshots
