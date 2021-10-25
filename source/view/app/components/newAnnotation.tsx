import * as React from "react";
import annoStyles from '../styles/annotation.module.css';

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
    const [anno, setAnno] = React.useState("");

    const cancelAnnotation = () => {
        notifyDone();
        vscode.postMessage({
            command: 'cancelAnnotation',
            anno: anno
        });
        setAnno("");
    }

    const createAnnotation = () => {
        notifyDone();
        vscode.postMessage({
              command: 'createAnnotation',
              anno: anno
        });
    }

    return (
        <div className={annoStyles['Pad']}>
            <div className={annoStyles['AnnotationContainer']} >
                <Syntax html={selection} />
                <textarea className={annoStyles['textbox']} id="newAnno" onKeyDown={(e) => {
                                if(e.key === "Enter") {
                                    createAnnotation();
                                }
                            }} onChange={_ => setAnno((document.getElementById('newAnno') as HTMLInputElement).value)}/>
                <button className={annoStyles['submit']} onClick={() => createAnnotation()}>Submit</button>
                <button className={annoStyles['cancel']} onClick={() => cancelAnnotation()}>Cancel</button>
            </div>
        </div>
    )

}

export default NewAnnotation;