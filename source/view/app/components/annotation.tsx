import * as React from "react";
import '../styles/annotation.css';
import Annotation from '../../../extension';
import { useEffect } from "react";

var shiki = require('shiki');

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
    }, [anno]);

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
                    <code>
                      {/* {shiki.getHighlighter({theme: 'nord'}).then((highlighter: any) => {
                        const html = highlighter.codeToHtml(anno.anchorText, anno.filename.toString().match(/\.[0-9a-z]+$/i))[0]
                        if(html) return html;
                      })} */}
                      {anno.anchorText}
                    </code>
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