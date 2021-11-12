import * as React from 'react';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsTrash } from 'react-icons/bs';
import styles from '../../styles/annotation.module.css';

interface Props {
    editAnnotation: () => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
  }
  
const AuthorOperationButtons: React.FC<Props> = ({ editAnnotation = () => {}, deleteAnnotation = () => {} }) => {
    return (
        <React.Fragment>
            <div onClick={editAnnotation} className={styles['DropdownItemOverwrite']}>
                 <div className={styles['DropdownIconsWrapper']}>
                     <AiOutlineEdit className={styles['profileMenu']} />
                 </div>
             </div>
             <div onClick={deleteAnnotation} className={styles['DropdownItemOverwrite']}>
                 <div className={styles['DropdownIconsWrapper']}>
                     <BsTrash className={styles['profileMenu']} />
                 </div>
             </div>
        </React.Fragment>
    )
}

export default AuthorOperationButtons;