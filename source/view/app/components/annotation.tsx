import * as React from "react";
import '../styles/annotation.css';
import Annotation from '../../../extension';
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
            <div>
                <li className="AnnotationContainer" onClick={() => scrollInEditor()}>
                  <div>
                    <Syntax html={anno.html} />
                  </div>
                  <div>
                    Annotation: {anno.annotation}
                  </div>
                  <div>
                    Location: Line {anno.startLine + 1} to Line {anno.endLine + 1}
                  </div>
                </li>
              </div>
        </React.Fragment>
    )

}

export default ReactAnnotation;