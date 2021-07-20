import * as React from "react";
import { AnnotationList, ICommand, CommandAction } from "./model";

interface IConfigProps {
  vscode: any;
  initialData: AnnotationList;
}

interface IConfigState {
  config: AnnotationList;
}

export default class AdamitePanel extends React.Component<
  IConfigProps,
  IConfigState
> {
  constructor(props: any) {
    super(props);

    let initialData = this.props.initialData;
    console.log('init', initialData)

    let oldState = this.props.vscode.getState();
    if (oldState) {
      this.state = oldState;
    } else {
      this.state = { config: initialData };
    }
  }

  

  render() {
    // vscode.window.showInformationMessage(
    //   `👍 Annotations saved to ${fileUri.fsPath + '/test.json'}`
    // );
    return (
      <React.Fragment>
        <h1>Hello World</h1>
        <div>
          {this.props.initialData.annotations?.map((anno) => {
            return(
              <li>
              {anno.anchorText}
              </li>
            )
          })}
          </div>
      </React.Fragment>
    );
  }

  
}