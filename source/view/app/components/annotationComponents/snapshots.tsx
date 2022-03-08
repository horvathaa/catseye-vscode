import * as React from 'react';
import { Snapshot as SnapshotInterface } from '../../../../constants/constants';
import { Syntax } from './anchor';
import UserProfile from './userProfile';
import AuthorOperationButtons from './authorOperationButtons';
import TextEditor from './textEditor';
import styles from '../../styles/annotation.module.css';
import { collapseExpandToggle } from '../../utils/viewUtilsTsx';

interface SnapshotProps {
    snapshot: SnapshotInterface,
    githubUsername: string,
    deleteHandler: (id: string) => void;
    submissionHandler: (snapshot: SnapshotInterface) => void;
}

export const Snapshot: React.FC<SnapshotProps> = ({ snapshot, githubUsername, deleteHandler, submissionHandler }) => {
    const [editing, setEditing] = React.useState<boolean>(false);

    return (
        <div className={styles['replyContainer']}>
            <div className={styles['topRow']}>
                <UserProfile 
                    githubUsername={snapshot.githubUsername}
                    createdTimestamp={snapshot.createdTimestamp}
                />
                {githubUsername === snapshot.githubUsername && (
                    <div className={styles['buttonRow']}>
                        <AuthorOperationButtons editAnnotation={() => setEditing(!editing)} deleteAnnotation={() => { if(deleteHandler) deleteHandler(snapshot.id) }}/>
                    </div>
                )}
            </div>
            <div className={styles['snapshotContainer']}>
                <Syntax html={snapshot.snapshot} />
            </div>
            {editing ? 
            <TextEditor 
                content={snapshot}
                submissionHandler={submissionHandler}
                cancelHandler={() => setEditing(false)}
                showSplitButton={false}
            />
            : `${snapshot.comment}`}
        </div>
    )
}

interface Props {
    snapshots: SnapshotInterface[],
    githubUsername: string,
    deleteHandler: (id: string) => void;
    submissionHandler: (snapshot: SnapshotInterface) => void;
}


const Snapshots : React.FC<Props> = ({ snapshots, githubUsername, submissionHandler, deleteHandler }) => {
    const [showingSnapshots, setShowingSnapshots] = React.useState<boolean>(false);
    const activeSnapshots: SnapshotInterface[] = snapshots.filter(s => !s.deleted);

    return (
        <div className={styles['outerSnapshotContainer']}>
            {activeSnapshots && activeSnapshots.length ? collapseExpandToggle(showingSnapshots, activeSnapshots, setShowingSnapshots, 'snapshot') : (null)}
            {showingSnapshots && activeSnapshots.map((s: SnapshotInterface) => {
                return <Snapshot 
                    snapshot={s}
                    githubUsername={githubUsername}
                    submissionHandler={submissionHandler}
                    deleteHandler={deleteHandler}
                />
            })}
        </div>
    )
}

export default Snapshots;