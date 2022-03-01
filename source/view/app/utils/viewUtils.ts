import * as vscode from 'vscode';
import { Annotation } from '../../../constants/constants';

const translateAnnotationAnchorStandard = (annoInfo: any) : {[ key: string ] : any } => {
	return {
		id: annoInfo.id,
		annotation: annoInfo.annotation,
		anchors: [
			{
				anchor: {
					startLine: annoInfo.startLine,
					startOffset: annoInfo.startOffset,
					endLine: annoInfo.endLine,
					endOffset: annoInfo.endOffset
				},
				anchorText: annoInfo.anchorText,
				html: annoInfo.html,
				filename: annoInfo.filename,
				gitUrl: annoInfo.gitUrl,
				stableGitUrl: annoInfo.stableGitUrl,
				visiblePath: annoInfo.visiblePath,
				anchorPreview: annoInfo.anchorPreview,
				programmingLang: annoInfo.programmingLang,
				anchorId: annoInfo.id + '-anchor-1',
				originalCode: annoInfo.originalCode,
				parentId: annoInfo.id
			}
		],
		deleted: annoInfo.deleted,
		outOfDate: annoInfo.outOfDate,
		authorId: annoInfo.authorId,
		createdTimestamp: annoInfo.createdTimestamp,
		gitRepo: annoInfo.gitRepo,
		gitBranch: annoInfo.gitBranch,
		gitCommit: annoInfo.gitCommit,
		projectName: annoInfo.projectName,
		githubUsername: annoInfo.githubUsername,
		replies: annoInfo.replies,
		outputs: annoInfo.outputs,
		codeSnapshots: annoInfo.codeSnapshots,
		sharedWith: annoInfo.sharedWith,
		selected: annoInfo.selected
	}
}

export const buildAnnotation = (annoInfo: any, range: vscode.Range | undefined = undefined) : Annotation => {
	let annoObj = null
	if(annoInfo.hasOwnProperty('anchor') || annoInfo.hasOwnProperty('anchorText')) {
		annoObj = translateAnnotationAnchorStandard(annoInfo)
	}
	else {
		annoObj = annoInfo;
	}

	return new Annotation(
		annoObj['id'], 
		annoObj['annotation'],
		annoObj['anchors'],
		annoObj['deleted'],
		annoObj['outOfDate'],
		annoObj['authorId'],
		annoObj['createdTimestamp'],
		annoObj['gitRepo'],
		annoObj['gitBranch'],
		annoObj['gitCommit'],
		annoObj['projectName'],
		annoObj['githubUsername'],
		annoObj['replies'],
		annoObj['outputs'],
		annoObj['codeSnapshots'],
		annoObj['sharedWith'],
		annoObj['selected'],
		annoObj['needToUpdate']
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

export const areListsTheSame = (obj1: any, obj2: any) : boolean => {
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


export const getAllAnnotationFilenames = (annotationList: Annotation[]) : string[] => {
	let allFiles: string[] = [];
	annotationList.forEach((a: Annotation) => {
		const files: string[] = [ ... new Set(a.anchors.map(a => a.filename))];
		if(!allFiles.some(f => files.includes(f))) {
			allFiles = [ ... new Set(allFiles.concat(files))];
		}
	})
	return allFiles;
	// return [ ... new Set (annotationList.flatMap(a => a.anchors.map(a => a.filename))) ];
}
