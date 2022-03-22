import * as React from 'react';
import { AiOutlineEdit } from 'react-icons/ai';
import { BsTrash } from 'react-icons/bs';
import styles from '../../styles/annotation.module.css';
import { Tooltip } from '@material-ui/core';

interface Props {
    editAnnotation: () => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
  }
  
const AuthorOperationButtons: React.FC<Props> = ({ editAnnotation = () => {}, deleteAnnotation = () => {} }) => {
    return (
        <React.Fragment>
            <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); editAnnotation(); }} className={styles['DropdownItemOverwrite']}>
                 <div className={styles['DropdownIconsWrapper']}>
                     <Tooltip title="Edit">
                        <div>
                            <AiOutlineEdit className={styles['profileMenu']} />
                        </div>
                     </Tooltip>
                 </div>
             </div>
             <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); deleteAnnotation(e); }} className={styles['DropdownItemOverwrite']}>
                 <div className={styles['DropdownIconsWrapper']}>
                     <Tooltip title="Delete">
                        <div>
                            <BsTrash className={styles['profileMenu']} />
                        </div>
                     </Tooltip>
                 </div>
             </div>
        </React.Fragment>
    )
}

export default AuthorOperationButtons;