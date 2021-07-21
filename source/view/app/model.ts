import Annotation from '../../extension';
export interface ICommand {
  action: CommandAction;
  content: Annotation[];
}
  
export enum CommandAction {
  Save
}