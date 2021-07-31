import * as React from "react";
import '../styles/annotation.css';

interface Props {
    selection: string;
    vscode: any;
}

const NewAnnotation: React.FC<Props> = ({ selection, vscode }) => {
    const [anno, setAnno] = React.useState("");

    const cancelAnnotation = () => {
        vscode.postMessage({
            command: 'cancelAnnotation',
            anno: anno
        });
        setAnno("");
    }

    const createAnnotation = () => {
        vscode.postMessage({
              command: 'createAnnotation',
              anno: anno
        });
    }

    return (
        <div className="AnnotationContainer" >
            Code: {selection}
            <textarea id="newAnno" onKeyDown={(e) => {
                            if(e.key === "Enter") {
                                createAnnotation();
                            }
                        }} onChange={_ => setAnno((document.getElementById('newAnno') as HTMLInputElement).value)}/>
            <button onClick={() => createAnnotation()}>Submit</button>
            <button onClick={() => cancelAnnotation()}>Cancel</button>
        </div>
    )

}

export default NewAnnotation;