import * as React from "react";
import Annotation from "../../extension";
import './styles/annotation.css';

interface IConfigProps {
  vscode: any;
  initialData: Annotation[];
}

interface IConfigState {
  config: Annotation[];
}

export default class AdamitePanel extends React.Component<
  IConfigProps,
  IConfigState
> {
  constructor(props: any) {
    super(props);

    let initialData = this.props.initialData;

    let oldState = this.props.vscode.getState();
    if (oldState) {
      this.state = oldState;
    } else {
      this.state = { config: initialData };
    }
  }

  scrollInEditor = (annoId: any) => {
    this.props.vscode.postMessage({
      command: 'scrollInEditor',
      id: annoId
    })
  }  

  render() {
    return (
      <React.Fragment>
        <h1>Your Annotations</h1>
        <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
          {this.props.initialData.map((anno) => {
            return (
              <li className="AnnotationContainer" onClick={() => this.scrollInEditor(anno.id)}>
                <div>
                  Code: {anno.anchorText}
                </div>
                <div>
                  Annotation: {anno.annotation}
                </div>
                <div>
                  Location: Line {anno.startLine + 1} to Line {anno.endLine + 1}
                </div>
              </li>
            )
          })}
        </ul>
      </React.Fragment>
    );
  }

  
}