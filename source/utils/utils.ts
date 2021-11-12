import firebase from '../firebase/firebase';
import Annotation from '../constants/constants';
import { computeRangeFromOffset } from '../anchorFunctions/anchor';
import { gitInfo, user, storedCopyText, annotationList, view, setAnnotationList, outOfDateAnnotations, deletedAnnotations } from '../extension';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { getAnnotationsOnSignIn } from '../firebase/functions/functions';
import { saveAnnotations as fbSaveAnnotations } from '../firebase/functions/functions';
var shiki = require('shiki');

let lastSavedAnnotations: Annotation[] = annotationList && annotationList.length ? annotationList : [];

// https://stackoverflow.com/questions/27030/comparing-arrays-of-objects-in-javascript
const objectsEqual = (o1: { [key: string ] : any }, o2: { [key: string ] : any }) : boolean => 
    typeof o1 === 'object' && Object.keys(o1).length > 0 
        ? Object.keys(o1).length === Object.keys(o2).length 
            && Object.keys(o1).every(p => objectsEqual(o1[p], o2[p]))
        : o1 === o2;

const arraysEqual = (a1: any[], a2: any[]) : boolean => {
	return a1.length === a2.length && a1.every((o, idx) => objectsEqual(o, a2[idx]));
}

export const initializeAnnotations = async (user: firebase.User) : Promise<void> => {
    const currFilename: string | undefined = vscode.window.activeTextEditor?.document.uri.path.toString();
    setAnnotationList(sortAnnotationsByLocation(await getAnnotationsOnSignIn(user), currFilename));
}

export const getFirstLineOfHtml = (html: string, isOneLineAnchor: boolean) : string => {
	const index: number = html.indexOf('<span style');
	const closingIndex: number = html.indexOf('<span class=\"line\">', index)
	return isOneLineAnchor ? html : html.substring(0, closingIndex) + '</code></pre>';
}

export const removeOutOfDateAnnotations = (annotationList: Annotation[]) : Annotation[] => {
	return annotationList.filter(a => !(a.deleted || a.outOfDate));
}

export function getListFromSnapshots(snapshots: firebase.firestore.QuerySnapshot) : any[] {
    let out: any = [];
    snapshots.forEach(snapshot => {
        out.push({
            id: snapshot.id, ...snapshot.data(),
        });
    });
    return out;
}

export const reconstructAnnotations = (annotationOffsetList: {[key: string] : any}[], text: string, changeRange: vscode.Range, filePath: vscode.Uri, workspace: vscode.Uri, doc: vscode.TextDocument) : Annotation[] => {
	return annotationOffsetList.map((a: {[key: string] : any}) => {
		const adjustedAnno = {
			id: uuidv4(),
			filename: filePath.toString(),
			visiblePath: getVisiblePath(a.anno.projectName, workspace.fsPath),
			anchorText: a.anno.anchorText,
			annotation: a.anno.annotation,
			anchor: computeRangeFromOffset(changeRange, a.offsetInCopy),
			deleted: false,
			outOfDate: false,
			html: a.anno.html,
			authorId: a.anno.authorId,
			createdTimestamp: new Date().getTime(),
			programmingLang: a.anno.programmingLang,
			gitRepo: a.anno.gitRepo,
			gitBranch: a.anno.gitBranch,
			gitCommit: a.anno.gitCommit,
			anchorPreview: a.anno.anchorPreview,
			projectName: a.anno.projectName,
			githubUsername: a.anno.githubUsername,
			replies: a.anno.replies
		}
		return buildAnnotation(adjustedAnno);
	});
}

export const didUserPaste = (changeText: string) : boolean => {
	return changeText === storedCopyText;
}

export const checkIfChangeIncludesAnchor = (annotationList : Annotation[], text: string) : Annotation[] => {
	const anchorTextArr : {[key: string] : any}[] = annotationList.map((a : Annotation) => { return { cleanText: a.anchorText.replace(/\s+/g, ''), id: a.id } });
	const cleanChangeText = text.replace(/\s+/g, '');
	if(cleanChangeText === "") return [];
	const matches: string[] = anchorTextArr.filter((a: {[key: string] : any}) => (cleanChangeText.includes(a.cleanText))).map(a => a.id); // bug: if the user annotates something common like just "console" this will match on other instances it shouldn't
	return annotationList.filter((a: Annotation) => matches.includes(a.id));
}


export const sortAnnotationsByLocation = (annotationList: Annotation[], filename: string | undefined) : Annotation[] => {
	annotationList.sort((a: Annotation, b: Annotation) => {
		return b.startLine - a.startLine === 0 ? b.startOffset - a.startOffset : b.startLine - a.startLine;
	});
	annotationList.sort((a: Annotation, b: Annotation) => {
		// if a is the same as the filename and b isn't OR if a and b are both pointing at the same file, keep the order
		// else move annotation b before a
		let order: number = -1;
		if(filename) order = (a.filename === filename && b.filename !== filename) || (a.filename === b.filename && a.filename === filename) ? -1 : 1;
		return order;
	})
	return annotationList;
}

export const getShikiCodeHighlighting = async (filename: string, anchorText: string): Promise<string> => {
	const highlighter: any = await shiki.getHighlighter({ theme: 'dark-plus' });
	const regexMatch: RegExpMatchArray | null = filename.match(/\.[0-9a-z]+$/i);
	const pl: string = regexMatch ? regexMatch[0].replace(".", "") : "js";
	const html: string = highlighter.codeToHtml(anchorText, pl);
	// either return the marked-up HTML or just return the basic anchor text
	return html ? html : anchorText;
}

const updateHtml = async (annos: Annotation[], doc: vscode.TextDocument) : Promise<Annotation[]> => {
	let updatedList : Annotation [] = [];
	for(let x = 0; x < annos.length; x++) {
		const newVscodeRange: vscode.Range = new vscode.Range(new vscode.Position(annos[x].startLine, annos[x].startOffset), new vscode.Position(annos[x].endLine, annos[x].endOffset));
		const newAnchorText: string = doc.getText(newVscodeRange);
		const newHtml: string = await getShikiCodeHighlighting(annos[x].filename.toString(), newAnchorText);
		const firstLine: string = getFirstLineOfHtml(newHtml, !newAnchorText.includes('\n'));
		const newAnno = buildAnnotation({
			...annos[x], html: newHtml, anchorText: newAnchorText, anchorPreview: firstLine
		});
		updatedList.push(newAnno);
	}

	return updatedList;

}


export const handleSaveCloseEvent = async (annotationList: Annotation[], filePath: string = "", currentFile: string = "all", doc : vscode.TextDocument | undefined = undefined) : Promise<void> => {
	const annosToSave: Annotation[] = annotationList.concat(outOfDateAnnotations, deletedAnnotations);
	const annotationsInCurrentFile = currentFile !== "all" ? annotationList.filter(a => a.filename === currentFile) : annotationList;
	if(doc && vscode.workspace.workspaceFolders) {
		let newList = await updateHtml(annotationsInCurrentFile, doc);
		const ids: string[] = newList.map(a => a.id);
		const visibleAnnotations: Annotation[] = currentFile === 'all' ? newList : annotationList.filter(a => !ids.includes(a.id)).concat(newList);
		setAnnotationList(visibleAnnotations);
		view?.updateDisplay(visibleAnnotations);
		lastSavedAnnotations = annosToSave;
		saveAnnotations(annosToSave, filePath);
	}
	else if(annotationsInCurrentFile.length && vscode.workspace.workspaceFolders && !arraysEqual(annosToSave, lastSavedAnnotations)) {
		lastSavedAnnotations = annosToSave;
		saveAnnotations(annosToSave, filePath);
	}
}

export const makeObjectListFromAnnotations = (annotationList: Annotation[]) : {[key: string] : any}[] => {
	return annotationList.map(a => { 
		return {
			id: a.id ? a.id : uuidv4(),
			filename: a.filename ? a.filename : "",
			visiblePath: a.visiblePath ? a.visiblePath : "",
			anchorText: a.anchorText ? a.anchorText : "",
			annotation: a.annotation ? a.annotation : "",
			anchor: {
				startLine: a.startLine ? a.startLine : 0,
				endLine: a.endLine ? a.endLine : 0,
				startOffset: a.startOffset ? a.startOffset : 0,
				endOffset: a.endOffset ? a.endOffset : 0
			},
			html: a.html ? a.html : "",
			authorId: a.authorId ? a.authorId : "",
			createdTimestamp: a.createdTimestamp ? a.createdTimestamp : new Date().getTime(),
			programmingLang: a.programmingLang ? a.programmingLang : "",
			deleted: a.deleted !== undefined ? a.deleted : true,
			outOfDate: a.outOfDate !== undefined ? a.outOfDate : false,
			gitRepo: a.gitRepo ? a.gitRepo : "",
			gitBranch: a.gitBranch ? a.gitBranch : "",
			gitCommit: a.gitCommit ? a.gitCommit : "",
			anchorPreview: a.anchorPreview ? a.anchorPreview : "",
			projectName: a.projectName ? a.projectName : "",
			githubUsername: a.githubUsername ? a.githubUsername : "",
			replies: a.replies ? a.replies : []
	}});
}

export const saveAnnotations = async (annotationList: Annotation[], filePath: string) : Promise<void> => {
	if(user) {
		fbSaveAnnotations(annotationList);
	}
	else if (vscode.workspace.workspaceFolders) {
		// console.log('writing to file')
		writeToFile(makeObjectListFromAnnotations(annotationList), annotationList, filePath);
	}
}

const writeToFile = async (serializedObjects: { [key: string] : any }[], annotationList: Annotation[], filePath: string) : Promise<void> => {
	const uri = vscode.Uri.file(filePath);
	try {
		await vscode.workspace.fs.stat(uri);
		vscode.workspace.openTextDocument(filePath).then(doc => { 
			vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
				annotationList.forEach(a => a.deleted = false);
			})
		})
	}
	catch {
		// console.log('file does not exist');
		const wsEdit = new vscode.WorkspaceEdit();
		wsEdit.createFile(uri)
		vscode.workspace.applyEdit(wsEdit).then((value: boolean) => {
			if(value) { // edit applied??
				vscode.workspace.openTextDocument(filePath).then(doc => { 
					vscode.workspace.fs.writeFile(doc.uri, new TextEncoder().encode(JSON.stringify(serializedObjects))).then(() => {
						annotationList.forEach(a => a.deleted = false);
					})
				})
			}
			else {
				vscode.window.showInformationMessage('Could not create file!');
			}
		});
	}
}

export const getVisiblePath = (projectName: string, workspacePath: string | undefined) : string => {
	if(projectName && workspacePath) {
		const path: string = workspacePath.substring(workspacePath.indexOf(projectName));
		if(path) return path;
	}
	else if(workspacePath) {
		return workspacePath;
	}
	return projectName;
}

export const updateAnnotationCommit = (commit: string, branch: string, repo: string) : void => {
	annotationList.forEach((a: Annotation) => {
		if(a.gitRepo === repo && a.gitCommit === 'localChange') {
			a.gitCommit = commit;
			a.gitBranch = branch;
		}
	});
}

export const generateGitMetaData = (gitApi: any) : {[key: string] : any} => {
	gitApi.repositories?.forEach((r: any) => {
		const currentProjectName: string = getProjectName(r?.rootUri?.path);
		r?.state?.onDidChange(() => {
			if(gitInfo[currentProjectName].commit !== r.state.HEAD.commit || gitInfo[currentProjectName].branch !== r.state.HEAD.name) {
				gitInfo[currentProjectName].commit = r.state.HEAD.commit;
				gitInfo[currentProjectName].branch = r.state.HEAD.name;
				updateAnnotationCommit(r.state.HEAD.commit, r.state.HEAD.name, r?.state?.remotes[0]?.fetchUrl);
			}
		});
		gitInfo[currentProjectName] = {
			repo: r?.state?.remotes[0]?.fetchUrl ? r?.state?.remotes[0]?.fetchUrl : r?.state?.remotes[0]?.pushUrl ? r?.state?.remotes[0]?.pushUrl : "",
			branch: r?.state?.HEAD?.name ? r?.state?.HEAD?.name : "",
			commit: r?.state?.HEAD?.commit ? r?.state?.HEAD?.commit : ""
		}
	});
	return gitInfo;
}


export const getProjectName = (filename: string | undefined) : string => {
	if(vscode.workspace.workspaceFolders && filename) {
		const slash: string = filename.includes('\\') ? '\\' : '\/';
		if(vscode.workspace.workspaceFolders.length > 1) {
			const candidateProjects: string[] = vscode.workspace.workspaceFolders.map((f: vscode.WorkspaceFolder) => f.name);
			return candidateProjects.filter((name: string) => filename.includes(name))[0] ? 
			candidateProjects.filter((name: string) => filename.includes(name))[0] : 
			filename.split(slash)[filename.split(slash).length - 1] ? filename.split(slash)[filename.split(slash).length - 1] :
			filename;
		}
		else if(vscode.workspace.workspaceFolders.length === 1) {
			return vscode.workspace.workspaceFolders[0].name;
		}
	}
	return "";
}

export const buildAnnotation = (annoInfo: any, range: vscode.Range | undefined = undefined) : Annotation => {
	const annoObj: { [key: string]: any } = 
		range ?
			{
				...annoInfo,
				startLine: range.start.line,
				endLine: range.end.line,
				startOffset: range.start.character,
				endOffset: range.end.character,
			}
		: annoInfo.anchor ?
			{
				...annoInfo,
				startLine: annoInfo.anchor.startLine,
				endLine: annoInfo.anchor.endLine,
				startOffset: annoInfo.anchor.startOffset,
				endOffset: annoInfo.anchor.endOffset,
			} 
		: annoInfo;


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
		annoObj['githubUsername'],
		annoObj['replies']
	)
}

