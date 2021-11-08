import * as React from "react";
import annoStyles from '../styles/annotation.module.css';
import TextEditor from "./annotationComponents/textEditor";

interface SynProps {
    html: string;
  }
  
  const Syntax: React.FC<SynProps> = ({ html }) => {
    return ( <code dangerouslySetInnerHTML={{__html: html}}></code> );
  }
interface Props {
    selection: string;
    vscode: any;
    notifyDone: () => void
}

const NewAnnotation: React.FC<Props> = ({ selection, vscode, notifyDone = () => {} }) => {
    const cancelAnnotation = () => {
        notifyDone();
        vscode.postMessage({
            command: 'cancelAnnotation',
        });
    }

    const createAnnotation = (annoContent: string) => {
        notifyDone();
        vscode.postMessage({
              command: 'createAnnotation',
              anno: annoContent
        });
    }

    return (
        <div className={annoStyles['Pad']}>
            <div className={annoStyles['AnnotationContainer']} >
                <Syntax html={selection} />
                <TextEditor 
                    annoContent={""} 
                    submissionHandler={createAnnotation} 
                    cancelHandler={cancelAnnotation} />
            </div>
        </div>
    )

}

export default NewAnnotation;