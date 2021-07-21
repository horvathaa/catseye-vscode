import * as React from "react";
import Annotation from "../../extension";

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
    console.log('init', initialData)

    let oldState = this.props.vscode.getState();
    if (oldState) {
      this.state = oldState;
    } else {
      this.state = { config: initialData };
    }
  }

  

  render() {
    
    return (
      <React.Fragment>
        <h1>Hello World</h1>
        <div>
          {this.props.initialData.map((anno) => {
            console.log('anno', anno);
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