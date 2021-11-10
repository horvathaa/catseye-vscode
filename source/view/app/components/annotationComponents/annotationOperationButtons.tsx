import * as React from 'react';
// import Dropdown from 'react-bootstrap/esm/Dropdown';
import AuthorOperationButtons from './authorOperationButtons';
import { VscComment } from 'react-icons/vsc';
import styles from '../../styles/annotation.module.css';

interface Props {
    userId: string,
    authorId: string;
    replyToAnnotation: () => void
    editAnnotation: () => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
  }
  
const AnnotationOperationButtons: React.FC<Props> = ({ userId, authorId, replyToAnnotation = () => {}, editAnnotation = () => {}, deleteAnnotation = () => {} }) => {
    return (
        <div className={styles['buttonRow']}>
            <div onClick={replyToAnnotation} className={styles['DropdownItemOverwrite']}>
                <div className={styles['DropdownIconsWrapper']}>
                    <VscComment className={styles['profileMenu']} />
                </div>
            </div> 
            {userId === authorId && <AuthorOperationButtons editAnnotation={editAnnotation} deleteAnnotation={deleteAnnotation} />}
        </div>
    )
}

export default AnnotationOperationButtons;