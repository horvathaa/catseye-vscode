import Annotation from '../../constants/constants';
export interface ICommand {
  action: CommandAction;
  content: Annotation[];
}
  
export enum CommandAction {
  Save
}