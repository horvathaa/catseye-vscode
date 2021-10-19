import * as React from 'react';
import Dropdown from 'react-bootstrap/esm/Dropdown';
import { AiOutlineMenu, AiOutlineEdit } from 'react-icons/ai';
import { BsTrash } from 'react-icons/bs';
import styles from '../../styles/annotation.module.css';

interface MenuProps {
    id: string,
    editAnnotation: () => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
  }
  
const AnnotationDropDown: React.FC<MenuProps> = ({ id, editAnnotation = () => {}, deleteAnnotation = () => {} }) => {
    return (
        <div className={styles['AnnotationsOptions']}>
        <Dropdown id={id}>
            <Dropdown.Toggle id={id + '-toggle'} className={styles['vertical-center']}>
                <AiOutlineMenu  />
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ width: '220px', border: '1px solid white', background: 'var(--vscode-editor-background)' }}>
                <Dropdown.Header className={styles["AnnotationOptionsTitle"]}>
                    Annotation Options
                    <hr></hr>
                </Dropdown.Header>
                <Dropdown.Item onClick={editAnnotation} className={styles['DropdownItemOverwrite']}>
                    <div className={styles['DropdownIconsWrapper']}>
                        <AiOutlineEdit  />
                    </div>
                    Edit
                </Dropdown.Item>
                <Dropdown.Item onClick={deleteAnnotation} className={styles['DropdownItemOverwrite']}>
                    <div className={styles['DropdownIconsWrapper']}>
                        <BsTrash   />
                    </div>
                    Delete
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
        </div>
    )
}

export default AnnotationDropDown;

// className={styles['DropdownIcons']} id={id + "-trash"}
// className={styles['DropdownIcons']} id={id + "-edit"}
// className={styles['profile']}