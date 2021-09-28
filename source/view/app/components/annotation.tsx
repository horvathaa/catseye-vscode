import * as React from "react";
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import { useEffect } from "react";
import { AiOutlineMenu, AiOutlineEdit } from 'react-icons/ai';
import { BsTrash } from 'react-icons/bs';
import Dropdown from 'react-bootstrap/esm/Dropdown';

interface SynProps {
  html: string;
}

const Syntax: React.FC<SynProps> = ({ html }) => {
  return ( <code dangerouslySetInnerHTML={{__html: html}}></code> );
}

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
              <AiOutlineMenu className={styles['profile']} />
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ width: '220px', border: '1px solid white', background: 'var(--vscode-editor-background)' }}>
              <Dropdown.Header className={styles["AnnotationOptionsTitle"]}>
                  Annotation Options
                  <hr></hr>
              </Dropdown.Header>
              <Dropdown.Item onClick={editAnnotation} className={styles['DropdownItemOverwrite']}>
                  <div className={styles['DropdownIconsWrapper']}>
                      <AiOutlineEdit className={styles['DropdownIcons']} id={id + "-edit"} />
                  </div>
                  Edit
              </Dropdown.Item>
              <Dropdown.Item onClick={deleteAnnotation} className={styles['DropdownItemOverwrite']}>
                  <div className={styles['DropdownIconsWrapper']}>
                      <BsTrash className={styles['DropdownIcons']} id={id + "-trash"} />
                  </div>
                  Delete
              </Dropdown.Item>
          </Dropdown.Menu>
      </Dropdown>
    </div>
  )
  
}

interface Props {
  annotation: Annotation;
  vscode: any;
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode }) => {
  const [anno, setAnno] = React.useState(annotation);
  const [edit, setEdit] = React.useState(false);
  const [newContent, setNewContent] = React.useState(anno.annotation);

  useEffect(() => {
    if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
      setAnno(annotation);
    }
  });

  const scrollInEditor = () => {
    vscode.postMessage({
      command: 'scrollInEditor',
      id: anno.id
    });
  }

  const updateAnnotationContent = () => {
    setNewContent((document.getElementById('editContent') as HTMLInputElement).value);
  }

  const updateContent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    anno.annotation = newContent;
    vscode.postMessage({
      command: 'updateAnnotation',
      annoId: anno.id,
      newAnnoContent: anno.annotation
    });
    setNewContent("");
    setEdit(false);
  }

  const cancelAnnotation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setNewContent("");
    setEdit(false);
  }

  const deleteAnnotation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      command: 'deleteAnnotation',
      annoId: anno.id,
    });
  }
    

  return (
      <React.Fragment>
          <div className={styles['Pad']}>
              <li key={annotation.id} className={styles['AnnotationContainer']}>
                <div className={styles['IconContainer']}>
                  <AnnotationDropDown id={anno.id} editAnnotation={() => {setEdit(!edit)}} deleteAnnotation={(e) => deleteAnnotation(e)}/>
                </div>
                <div className={styles['AnchorContainer']} onClick={() => scrollInEditor()}>
                  <Syntax html={anno.html} />
                </div>
                <div className={styles['LocationContainer']}>
                  {anno.visiblePath}: Line {anno.startLine + 1} to Line {anno.endLine + 1}
                </div>
                <div className={styles['ContentContainer']}>
                  {edit ? (
                    <React.Fragment>
                      <textarea value={newContent} onChange={updateAnnotationContent} id="editContent" />
                      <button className={styles['submit']} onClick={(e) => updateContent(e)}>Submit</button>
                      <button className={styles['cancel']} onClick={(e) => cancelAnnotation(e)}>Cancel</button>
                    </React.Fragment>
                  ) : (`${anno.annotation}`)}
                </div>
              </li>
            </div>
      </React.Fragment>
  )

}

export default ReactAnnotation;