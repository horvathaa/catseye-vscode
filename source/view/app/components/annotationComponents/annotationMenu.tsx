// import * as React from 'react';
// import Dropdown from 'react-bootstrap/esm/Dropdown';
// import { AiOutlineMenu, AiOutlineEdit } from 'react-icons/ai';
// import { BsTrash } from 'react-icons/bs';
// import { VscComment } from 'react-icons/vsc';
// import styles from '../../styles/annotation.module.css';

// interface MenuProps {
//     id: string,
//     replyToAnnotation: () => void
//     editAnnotation: () => void
//     deleteAnnotation: (e: React.SyntheticEvent) => void
//   }
  
// const AnnotationDropDown: React.FC<MenuProps> = ({ id, replyToAnnotation = () => {}, editAnnotation = () => {}, deleteAnnotation = () => {} }) => {
//     return (
//         <div className={styles['AnnotationsOptions']}>
//             <Dropdown id={id}>
//                 <Dropdown.Toggle id={id + '-toggle'} className={styles['vertical-center']}>
//                     <AiOutlineMenu className={styles['profile']} />
//                 </Dropdown.Toggle>
//                 <Dropdown.Menu style={{ width: '220px', border: '1px solid white', background: 'var(--vscode-editor-background)' }}>
//                     <Dropdown.Header className={styles["AnnotationOptionsTitle"]}>
//                         Annotation Options
//                         <hr></hr>
//                     </Dropdown.Header>
//                     <Dropdown.Item onClick={replyToAnnotation} className={styles['DropdownItemOverwrite']}>
//                         <div className={styles['DropdownIconsWrapper']}>
//                             <VscComment className={styles['profileMenu']} />
//                         </div>
//                         Reply
//                     </Dropdown.Item>
//                     <Dropdown.Item onClick={editAnnotation} className={styles['DropdownItemOverwrite']}>
//                         <div className={styles['DropdownIconsWrapper']}>
//                             <AiOutlineEdit className={styles['profileMenu']} />
//                         </div>
//                         Edit
//                     </Dropdown.Item>
//                     <Dropdown.Item onClick={deleteAnnotation} className={styles['DropdownItemOverwrite']}>
//                         <div className={styles['DropdownIconsWrapper']}>
//                             <BsTrash className={styles['profileMenu']} />
//                         </div>
//                         Delete
//                     </Dropdown.Item>
//                 </Dropdown.Menu>
//             </Dropdown>
//         </div>
//     )
// }

// export default AnnotationDropDown;