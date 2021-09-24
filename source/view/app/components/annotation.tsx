import * as React from "react";
import styles from '../styles/annotation.module.css';
import Annotation from '../../../constants/constants';
import { useEffect } from "react";

interface SynProps {
  html: string;
}

const Syntax: React.FC<SynProps> = ({ html }) => {
  return ( <code dangerouslySetInnerHTML={{__html: html}}></code> );
}

interface Props {
  annotation: Annotation;
  vscode: any;
}

const ReactAnnotation: React.FC<Props> = ({ annotation, vscode }) => {
    const [anno, setAnno] = React.useState(annotation);

    useEffect(() => {
      if(JSON.stringify(anno) !== JSON.stringify(annotation)) {
        setAnno(annotation);
      }
    });

    const scrollInEditor = () => {
        vscode.postMessage({
          command: 'scrollInEditor',
          id: anno.id
        })
    }


    return (
        <React.Fragment>
            <div className={styles['Pad']}>
                <li key={anno.id} className={styles['AnnotationContainer']} onClick={() => scrollInEditor()}>
                  <div className={styles['AnchorContainer']}>
                    <Syntax html={anno.html} />
                  </div>
                  <div className={styles['ContentContainer']}>
                    {anno.annotation}
                  </div>
                  <div className={styles['LocationContainer']}>
                    {anno.visiblePath}: Line {anno.startLine + 1} to Line {anno.endLine + 1}
                  </div>
                </li>
              </div>
        </React.Fragment>
    )

}

export default ReactAnnotation;