import * as vscode from 'vscode';
import Annotation from '../../constants/constants';

export const buildAnnotation = (annoInfo: any, range: vscode.Range | undefined = undefined) : Annotation => {
	const annoObj : { [key: string]: any } = range ? 
	{
		startLine: range.start.line,
		endLine: range.end.line,
		startOffset: range.start.character,
		endOffset: range.end.character,
		...annoInfo
	} : annoInfo.anchor ? {
		startLine: annoInfo.anchor.startLine,
		endLine: annoInfo.anchor.endLine,
		startOffset: annoInfo.anchor.startOffset,
		endOffset: annoInfo.anchor.endOffset,
		...annoInfo
	} : annoInfo;

	return new Annotation(
		annoObj['id'], 
		annoObj['filename'], 
		annoObj['visiblePath'], 
		annoObj['anchorText'],
		annoObj['annotation'],
		annoObj['startLine'],
		annoObj['endLine'],
		annoObj['startOffset'],
		annoObj['endOffset'],
		annoObj['deleted'],
		annoObj['outOfDate'],
		annoObj['html'],
		annoObj['authorId'],
		annoObj['createdTimestamp'],
		annoObj['programmingLang'],
		annoObj['gitRepo'],
		annoObj['gitBranch'],
		annoObj['gitCommit'],
        annoObj['anchorPreview'],
        annoObj['projectName'],
        annoObj['githubUsername']
	)
}

export const formatTimestamp = (timestamp: number) : string => {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = date.getDate();
    const hour = date.getHours();
    const min = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    const time = hour + ':' + min + ' ' + day + ' ' + month + ' ' + year;
    return time;
}