export interface Annotation {
    name: string;
    description: string;
    anchorText: string;
    anchorLocation: string
}

export interface AnnotationList {
  annotations?: Annotation[]
}
export interface ICommand {
  action: CommandAction;
  content: AnnotationList;
}
  
export enum CommandAction {
  Save
}