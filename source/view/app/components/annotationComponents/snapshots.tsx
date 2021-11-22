import * as React from 'react';
import { Syntax } from './anchor';
import styles from '../../styles/annotation.module.css';
import { VscChevronRight, VscChevronLeft } from 'react-icons/vsc';
import { collapseExpandToggle } from '../../utils/viewUtilsTsx';

interface Props {
    snapshots: {[key: string]: any}[]
}

const Snapshots : React.FC<Props> = ({ snapshots }) => {
    const [snapshotShowing, setSnapshotShowing] = React.useState<number>(0);
    const [showingSnapshots, setShowingSnapshots] = React.useState<boolean>(false);

    const changeSnapshots = () : React.ReactElement | null => {
        if(!snapshots) return null;

        if(snapshots.length === 1) {
            return <Syntax html={snapshots[0].snapshot} />
        }
        else if(snapshots.length > 1 && snapshotShowing === 0) {
            return (
                <div className={styles['snapshotContainer']}>
                    <Syntax html={snapshots[0].snapshot} />
                    <div className={styles['arrowBox']}>
                        <VscChevronRight onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setSnapshotShowing((snapshotShowing) => snapshotShowing + 1) }} className={styles['IconContainer']} /> 
                    </div>
                </div>
            )
        }
        else if(snapshots.length > 1 && snapshotShowing > 0 && snapshotShowing !== (snapshots.length - 1)) {
                return (
                    <div className={styles['snapshotContainer']}>
                        <div className={styles['arrowBox-leftAlign']}>
                            <VscChevronLeft onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setSnapshotShowing((snapshotShowing) => snapshotShowing - 1) }} className={styles['IconContainer']} /> 
                        </div>
                        <Syntax html={snapshots[snapshotShowing].snapshot} />
                        <div className={styles['arrowBox']}>
                            <VscChevronRight onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setSnapshotShowing((snapshotShowing) => snapshotShowing + 1) }} className={styles['IconContainer']} /> 
                        </div>
                    </div>
                )
        }
        else if(snapshotShowing === (snapshots.length - 1)) {
            return (
                <div className={styles['snapshotContainer']}>
                    <div className={styles['arrowBox-leftAlign']}>
                        <VscChevronLeft onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setSnapshotShowing((snapshotShowing) => snapshotShowing - 1) }} className={styles['IconContainer']} /> 
                    </div>
                    <Syntax html={snapshots[snapshotShowing].snapshot} />
                </div>
            );
        }
        return null;
    }

    return (
        <div className={styles['outerSnapshotContainer']}>
            {snapshots && snapshots.length ? collapseExpandToggle(showingSnapshots, snapshots, setShowingSnapshots, 'snapshot') : (null)}
            {showingSnapshots && changeSnapshots()}
        </div>
    )
}

export default Snapshots;