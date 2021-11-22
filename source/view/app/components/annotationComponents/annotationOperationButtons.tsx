import * as React from 'react';
import AuthorOperationButtons from './authorOperationButtons';
import { VscComment, VscDeviceCamera, VscFileSymlinkFile } from 'react-icons/vsc';
import styles from '../../styles/annotation.module.css';

interface Props {
    userId: string,
    authorId: string;
    replyToAnnotation: () => void;
    editAnnotation: () => void;
    exportAnnotationAsComment: () => void;
    deleteAnnotation: (e: React.SyntheticEvent) => void;
    snapshotCode: (e: React.SyntheticEvent) => void;
  }
  
const AnnotationOperationButtons: React.FC<Props> = ({ userId, authorId, replyToAnnotation, exportAnnotationAsComment, editAnnotation, deleteAnnotation, snapshotCode }) => {
    return (
        <div className={styles['buttonRow']}>
            <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); replyToAnnotation(); }} className={styles['DropdownItemOverwrite']}>
                <div className={styles['DropdownIconsWrapper']}>
                    <VscComment className={styles['profileMenu']} />
                </div>
            </div> 
            <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); exportAnnotationAsComment(); }} className={styles['DropdownItemOverwrite']}>
                <div className={styles['DropdownIconsWrapper']}>
                    <VscFileSymlinkFile className={styles['profileMenu']} />
                </div>
            </div>
            <div onClick={(e: React.SyntheticEvent) => { snapshotCode(e); }} className={styles['DropdownItemOverwrite']}>
                <div className={styles['DropdownIconsWrapper']}>
                    <VscDeviceCamera className={styles['profileMenu']} />
                </div>
            </div>
            {userId === authorId && <AuthorOperationButtons editAnnotation={editAnnotation} deleteAnnotation={deleteAnnotation} />}
        </div>
    )
}

export default AnnotationOperationButtons;