import * as React from "react";
import { useEffect } from "react";
import { useState } from "react";
import Annotation from '../../extension';
import ReactAnnotation from './components/annotation';
import NewAnnotation from "./components/newAnnotation";
import LogIn from './components/login';
import './styles/annotation.css';

interface Props {
  vscode: any;
  data: Annotation[];
  selection: string;
  login: boolean;
}

const areListsTheSame = (obj1: any, obj2: any) => {
  for (var p in obj1) {
		//Check property exists on both objects
		if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;
 
		switch (typeof (obj1[p])) {
			//Deep compare objects
			case 'object':
				if (areListsTheSame(obj1[p], obj2[p])) return false;
				break;
			//Compare function code
			case 'function':
				if (typeof (obj2[p]) == 'undefined' || (p != 'compare' && obj1[p].toString() != obj2[p].toString())) return false;
				break;
			//Compare values
			default:
				if (obj1[p] != obj2[p]) return false;
		}
	}
 
	//Check object 2 for any extra properties
	for (var p in obj2) {
		if (typeof (obj1[p]) == 'undefined') return false;
	}
	return true;
}



const AdamitePanel: React.FC<Props> = ({ vscode, data, selection, login }) => {
  const [annotations, setAnnotations] = useState(data);

  useEffect(() => {
    if(!areListsTheSame(annotations, data)) {
      setAnnotations(data);
    }
  }, [annotations]);

  const AnnotationList: JSX.Element = (
    <React.Fragment>
        <h1>Your Annotations</h1>
          <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
            {annotations.map((anno: Annotation) => {
              return (
                <ReactAnnotation annotation={anno} vscode={vscode}/>
              )
            })}
          </ul>
    </React.Fragment>
  )

  return (
    <React.Fragment>
      {selection !== "" ? (
        <NewAnnotation selection={selection} vscode={vscode} />
      ) : (null)}
      {!login && AnnotationList}
      {login && <LogIn vscode={vscode} />}
    </React.Fragment>
  )


}

export default AdamitePanel;