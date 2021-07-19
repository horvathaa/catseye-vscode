import * as React from "react";
import { IConfig, IUser, ICommand, CommandAction } from "./model";

interface IConfigProps {
  vscode: any;
  initialData: IConfig;
}

interface IConfigState {
  config: IConfig;
}

export default class Config extends React.Component<
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

  private defineState(newSate: IConfigState) {
    this.setState(newSate);
    this.props.vscode.setState(newSate);
  }

  onChangeUserActiveState(userIndex: number) {
    let newState = { ...this.state };
    newState.config.users[userIndex].active = !newState.config.users[userIndex]
      .active;

    this.defineState(newState);
  }

  
  renderUsers(users: IUser[]) {
    return (
      <React.Fragment>
        <h2>User List :</h2>
        <ul className="">
          {users && users.length > 0
            ? users.map((user, userIndex) => {
                let roles =
                  user.roles && user.roles.length > 0
                    ? user.roles.join(",")
                    : null;

                return (
                  <li key={userIndex}>
                    {user.name}
                    <br />
                    Is active :{" "}
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={() => this.onChangeUserActiveState(userIndex)}
                    />
                    <br />
                    Roles : {roles}
                    <input
                      type="text"
                      placeholder="Add Role"
                    />
                  </li>
                );
              })
            : null}
        </ul>
        <input
          type="text"
          placeholder="Add User"
        />
      </React.Fragment>
    );
  }

  render() {
    return (
      <React.Fragment>
        <h1>Config name : {this.state.config.name}</h1>{" "}
        {this.state.config.description}
        {this.renderUsers(this.state.config.users)}
        <br />
        <input
          className="save"
          type="button"
          value="Save the configuration"
          onClick={() => this.saveConfig()}
        />
      </React.Fragment>
    );
  }

  saveConfig() {
    let command: ICommand = {
      action: CommandAction.Save,
      content: this.state.config
    };
    this.props.vscode.postMessage(command);
  }
}