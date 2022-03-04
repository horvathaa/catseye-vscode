import firebase from '../firebase/firebase';
import { Annotation, AnchorObject, Anchor, Snapshot } from '../constants/constants';
import { computeRangeFromOffset, createAnchorFromRange } from '../anchorFunctions/anchor';
import { gitInfo, user, storedCopyText, annotationList, view, setAnnotationList, outOfDateAnnotations, deletedAnnotations, adamiteLog, setSelectedAnnotationsNavigations } from '../extension';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { getAnnotationsOnSignIn } from '../firebase/functions/functions';
import { saveAnnotations as fbSaveAnnotations } from '../firebase/functions/functions';
let { parse } = require('what-the-diff');
var shiki = require('shiki');

let lastSavedAnnotations: Annotation[] = annotationList && annotationList.length ? annotationList : [];

// https://stackoverflow.com/questions/27030/comparing-arrays-of-objects-in-javascript
export const objectsEqual = (o1: any, o2: any) : boolean => 
	typeof o1 === 'object' && Object.keys(o1).length > 0 
		? Object.keys(o1).length === Object.keys(o2).length 
			&& Object.keys(o1).every(p => objectsEqual(o1[p], o2[p]))
		: o1 === o2;

const arraysEqual = (a1: any[], a2: any[]) : boolean => {
	return a1.length === a2.length && a1.every((o, idx) => objectsEqual(o, a2[idx]));
}

export const initializeAnnotations = async (user: firebase.User) : Promise<void> => {
	// console.log('gitInfo in initalize', gitInfo);
	// console.log('project', getProjectName());
	const currFilename: string | undefined = vscode.window.activeTextEditor?.document.uri.path.toString();
	const annotations: Annotation [] = sortAnnotationsByLocation(await getAnnotationsOnSignIn(user), currFilename);
	setAnnotationList(sortAnnotationsByLocation(await getAnnotationsOnSignIn(user), currFilename));
	const selectedAnnotations: Annotation[] = annotations.filter(a => a.selected);
	setSelectedAnnotationsNavigations(
		selectedAnnotations.length ? 
		selectedAnnotations.map((a: Annotation) => {
			return { id: a.id, anchorId: a.anchors[0].anchorId, lastVisited: false}
		}) : []
	);
}

export const removeNulls = (arr: any[]) : any[] => {
	return arr.filter(a => a !== null);
}

export function partition(array: any[], isValid: (a: any) => boolean) {
	return array.reduce(([pass, fail], elem) => {
	  return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]];
	}, [[], []]);
}

export const getAnnotationsWithStableGitUrl = (annotationList: Annotation[], stableGitUrl: string) : Annotation[] => {
	return annotationList.filter(a => {
		const annoUrls = getAllAnnotationStableGitUrls([a])
		return annoUrls.includes(stableGitUrl);
	})
}

export const getAnnotationsInFile = (annotationList: Annotation[], filename: string) : Annotation[] => {
	return annotationList.filter(a => {
		const annoFiles = getAllAnnotationFilenames([a])
		return annoFiles.includes(filename);
	})
}

export const getAnnotationsNotInFile = (annotationList: Annotation[], filename: string) : Annotation[] => {
	return annotationList.filter(a => {
		const annoFiles = getAllAnnotationFilenames([a])
		return !annoFiles.includes(filename);
	})
}

export const getAllAnnotationFilenames = (annotationList: Annotation[]) : string[] => {
	const flatMapReturn = annotationList.flatMap(a => {
		// console.log('a', a);
		return a.anchors?.map(a => a.filename) 
	});
	return [ ... new Set(flatMapReturn) ];
}

export const getAllAnnotationStableGitUrls = (annotationList: Annotation[]) : string[] => {
	return [ ... new Set(annotationList.flatMap(a => a.anchors.map(a => a.stableGitUrl))) ];
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
	console.log('workspace', workspace.fsPath)
	return annotationOffsetList.map((a: {[key: string] : any}) => {
		const visiblePath: string = vscode.workspace.workspaceFolders ? 
			getVisiblePath(a.anno.projectName, vscode.window.activeTextEditor?.document.uri.fsPath) : vscode.window.activeTextEditor?.document.uri.fsPath ? vscode.window.activeTextEditor?.document.uri.fsPath : "" 
		const projectName: string = getProjectName(filePath.toString());
		const newAnnoId: string = uuidv4();
		const anchorObject: AnchorObject = {
			anchor: computeRangeFromOffset(changeRange, a.offsetInCopy),
			anchorText: a.anchor.anchorText,
			html: a.anchor.html,
			filename: filePath.toString(),
			gitUrl: getGithubUrl(visiblePath, projectName, false), // a.anno.gitUrl,
			stableGitUrl: getGithubUrl(visiblePath, projectName, true),
			visiblePath,
			anchorPreview: a.anchor.anchorPreview,
			programmingLang: a.anchor.programmingLang,
			anchorId: uuidv4(),
			originalCode: a.anchor.originalCode,
			parentId: newAnnoId
		}
		const adjustedAnno = {
			id: newAnnoId,
			annotation: a.anno.annotation,
			anchors: [anchorObject],
			deleted: false,
			outOfDate: false,
			authorId: a.anno.authorId,
			createdTimestamp: new Date().getTime(),
			gitRepo: gitInfo[projectName]?.repo, // a.anno.gitRepo,
			gitBranch: gitInfo[projectName]?.branch,
			gitCommit: gitInfo[projectName]?.commit,
			projectName: projectName,
			githubUsername: gitInfo.author,
			replies: a.anno.replies,
			outputs: a.anno.outputs,
			codeSnapshots: a.anno.codeSnapshots,
			sharedWith: a.anno.sharedWith,
			selected: a.anno.selected,
			needToUpdate: true
		}

		return buildAnnotation(adjustedAnno);
	});
}

export const didUserPaste = (changeText: string) : boolean => {
	return changeText === storedCopyText;
}

const checkIfAnnotationIncludesChange = (anno: Annotation, text: string) : boolean => {
	const cleanChangeText = text.replace(/\s+/g, '');
	if(cleanChangeText === "") return false;
	const anchorTextArr: string[] = anno.anchors.map(a => a.anchorText.replace(/\s+/g, ''));
	return anchorTextArr.includes(cleanChangeText);
}

export const checkIfChangeIncludesAnchor = (annotationList : Annotation[], text: string) : Annotation[] => {
	return annotationList.filter((a: Annotation) => checkIfAnnotationIncludesChange(a, text));
}

const sortAnchorsByLocation = (anchors: AnchorObject[]) : AnchorObject[] => {
	return anchors.sort((a: AnchorObject, b: AnchorObject) => {
		return b.anchor.startLine - a.anchor.startLine === 0 ? b.anchor.startOffset - a.anchor.startOffset : b.anchor.startLine - a.anchor.startLine;
	});
}

export const sortAnnotationsByLocation = (annotationList: Annotation[], filename: string | undefined) : Annotation[] => {
	const sortedAnchors: string[] = sortAnchorsByLocation(annotationList.flatMap(a => a.anchors)).map(a => a.parentId);
	annotationList.sort((a: Annotation, b: Annotation) => {
		return sortedAnchors.indexOf(b.id) - sortedAnchors.indexOf(a.id);
	});
	// annotationList.sort((a: Annotation, b: Annotation) => {
	// 	// if a is the same as the filename and b isn't OR if a and b are both pointing at the same file, keep the order
	// 	// else move annotation b before a
	// 	let order: number = -1;
	// 	if(filename) order = (a.filename === filename && b.filename !== filename) || (a.filename === b.filename && a.filename === filename) ? -1 : 1;
	// 	return order;
	// })
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

const updateAnchorHtml = async (anno: Annotation, doc: vscode.TextDocument) : Promise<Annotation> => {
	const updatedAnchors: AnchorObject[] = await Promise.all(anno.anchors.map(async (a: AnchorObject) => {
		if(a.filename === doc.uri.toString()) {
			const newVscodeRange: vscode.Range = new vscode.Range(new vscode.Position(a.anchor.startLine, a.anchor.startOffset), new vscode.Position(a.anchor.endLine, a.anchor.endOffset));
			const newAnchorText: string = doc.getText(newVscodeRange);
			const newHtml: string = await getShikiCodeHighlighting(a.filename.toString(), newAnchorText);
			const firstLine: string = getFirstLineOfHtml(newHtml, !newAnchorText.includes('\n'));
			return { ...a, html: newHtml, anchorText: newAnchorText, anchorPreview: firstLine }
		}
		else {
			return a;
		}
		
	}));
	return buildAnnotation({ ...anno, anchors: updatedAnchors, needToUpdate: true })
}

const updateHtml = async (annos: Annotation[], doc: vscode.TextDocument) : Promise<Annotation[]> => {
	let updatedList : Annotation [] = [];
	for(let x = 0; x < annos.length; x++) {
		const newAnno = await updateAnchorHtml(annos[x], doc);
		updatedList.push(newAnno);
	}

	return updatedList;

}

export const getAllAnnotationsWithAnchorInFile = (annotationList: Annotation[], currentFile: string) : Annotation[] => {
	return annotationList.filter((a: Annotation) => {
		const filesThisAnnotationIsIn: string[] = a.anchors.map(a => a.filename);
		return filesThisAnnotationIsIn.includes(currentFile);
	})
}

export const handleSaveCloseEvent = async (annotationList: Annotation[], filePath: string = "", currentFile: string = "all", doc : vscode.TextDocument | undefined = undefined) : Promise<void> => {
	const annosToSave: Annotation[] = annotationList.concat(outOfDateAnnotations, deletedAnnotations);
	const annotationsInCurrentFile = currentFile !== "all" ? getAllAnnotationsWithAnchorInFile(annotationList, currentFile) : annotationList;
	if(doc && vscode.workspace.workspaceFolders) {
		let newList = await updateHtml(annotationsInCurrentFile, doc);
		const ids: string[] = newList.map(a => a.id);
		const visibleAnnotations: Annotation[] = currentFile === 'all' ? newList : annotationList.filter(a => !ids.includes(a.id)).concat(newList);
		setAnnotationList(visibleAnnotations);
		view?.updateDisplay(visibleAnnotations);
		if(annosToSave.some((a: Annotation) => a.needToUpdate)) {
			lastSavedAnnotations = annosToSave;
			saveAnnotations(annosToSave.filter(a => a.needToUpdate), filePath);
			const updatedList: Annotation[] = annosToSave.map(a => { return buildAnnotation({ ...a, needToUpdate: false }) });
			setAnnotationList(removeOutOfDateAnnotations(updatedList));
		}

	}
	else if(annotationsInCurrentFile.length && vscode.workspace.workspaceFolders && !arraysEqual(annosToSave, lastSavedAnnotations)) {
		lastSavedAnnotations = annosToSave;
		saveAnnotations(annosToSave.filter(a => a.needToUpdate), filePath);
	}
}

const translateSnapshotStandard = (snapshots: any[]) : Snapshot[] => {
	return snapshots.map((s: any) => {
		return {
			createdTimestamp: s.createdTimestamp,
			snapshot: s.snapshot,
			githubUsername: "",
			id: uuidv4(),
			comment: "",
			deleted: false
		}
	})
}

export const makeObjectListFromAnnotations = (annotationList: Annotation[]) : {[key: string] : any}[] => {
	return annotationList.map(a => { 
		return {
			id: a.id ? a.id : uuidv4(),
			// filename: a.filename ? a.filename : "",
			// visiblePath: a.visiblePath ? a.visiblePath : "",
			// anchorText: a.anchorText ? a.anchorText : "",
			annotation: a.annotation ? a.annotation : "",
			anchors: a.anchors ? a.anchors : [{ }],
			// anchor: {
			// 	startLine: a.startLine ? a.startLine : 0,
			// 	endLine: a.endLine ? a.endLine : 0,
			// 	startOffset: a.startOffset ? a.startOffset : 0,
			// 	endOffset: a.endOffset ? a.endOffset : 0
			// },
			// html: a.html ? a.html : "",
			authorId: a.authorId ? a.authorId : "",
			createdTimestamp: a.createdTimestamp ? a.createdTimestamp : new Date().getTime(),
			// programmingLang: a.programmingLang ? a.programmingLang : "",
			deleted: a.deleted !== undefined ? a.deleted : true,
			outOfDate: a.outOfDate !== undefined ? a.outOfDate : false,
			gitRepo: a.gitRepo ? a.gitRepo : "",
			gitBranch: a.gitBranch ? a.gitBranch : "",
			gitCommit: a.gitCommit ? a.gitCommit : "",
			// gitUrl: a.gitUrl ? a.gitUrl : "",
			// stableGitUrl: a.stableGitUrl ? a.stableGitUrl : "",
			// anchorPreview: a.anchorPreview ? a.anchorPreview : "",
			projectName: a.projectName ? a.projectName : "",
			githubUsername: a.githubUsername ? a.githubUsername : "",
			replies: a.replies ? a.replies : [],
			outputs: a.outputs ? a.outputs : [],
			// originalCode: a.originalCode ? a.originalCode : "",
			codeSnapshots: a.codeSnapshots ? a.codeSnapshots.length > 0 && a.codeSnapshots[0].hasOwnProperty('githubUsername') ? a.codeSnapshots : translateSnapshotStandard(a.codeSnapshots) : [],
			sharedWith: a.sharedWith ? a.sharedWith : "private",
			selected: a.selected ? a.selected : false
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

export const getGithubUrl = (visiblePath: string, projectName: string, returnStable: boolean) : string => {
	adamiteLog.appendLine('params = visiblePath: ' + visiblePath + ' projectName: ' + projectName + 'returnStable: ' + returnStable)
	adamiteLog.appendLine("repo: " + gitInfo[projectName]?.repo);
	if(!gitInfo[projectName]?.repo || gitInfo[projectName]?.repo === "") return "";
	const baseUrl: string = gitInfo[projectName].repo.split('.git')[0];
	adamiteLog.appendLine("baseUrl: " + baseUrl);
	const endUrl: string = visiblePath.includes('\\') ? visiblePath.split(projectName)[1].replace(/\\/g, '/') : visiblePath.split(projectName)[1]; // '\\' : '\/';
	adamiteLog.appendLine("endUrl: " + endUrl);
	// console.log('wheehoo', baseUrl + "/tree/" + gitInfo[projectName].commit + endUrl)
	return gitInfo[projectName].commit === 'localChange' || returnStable ? baseUrl + "/tree/main" + endUrl :  baseUrl + "/tree/" + gitInfo[projectName].commit + endUrl;
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

export const generateGitMetaData = async (gitApi: any) : Promise<{[key: string] : any}> => {
	await gitApi.repositories?.forEach(async (r: any) => {
		const currentProjectName: string = getProjectName(r?.rootUri?.path);
		// const branch = await r?.diff()
		// console.log(branch);
		r?.state?.onDidChange(async () => {
			// console.log('calling on did change', r.state, 'gitInfo', gitInfo);
			const currentProjectName: string = getProjectName(r?.rootUri?.path);
			// const diffs = await r?.diffBetween('origin/HEAD', gitInfo[currentProjectName].branch);
			// // if(diffs.length > 0 && diffs.length !== gitInfo[currentProjectName].changes.length) {
			// 	gitInfo[currentProjectName] = { ...gitInfo[currentProjectName], changes: diffs };
				// diffs.forEach(async (diff: {[key: string]: any}) => {
				// 	console.log('diff', diff);
				// 	const path: string = '.' + diff.uri.path.split(currentProjectName)[1];
				// 	let diffWithMain = await r?.diffBetween('origin/HEAD', gitInfo[currentProjectName].branch, path);
				// 	// console.log('diffWithMain', diffWithMain);
				// 	const diffData = parse(diffWithMain);
				// 	// console.log('diffData', diffData);
				// 	const annotationsInFile: Annotation[] = annotationList.filter(a => '.' + a.filename.toString().split(currentProjectName)[1] === path)
				// 	if(diffData.length && annotationsInFile.length)
				// 	// updateAnchorsUsingDiffData(diffData, annotationsInFile);
				// }) 
			// }
			// let diffWithMain = await r?.diffBetween('origin/HEAD', gitInfo[currentProjectName].branch, './source/anchorFunctions/anchor.ts')
			// console.log('diff', diffs)
			// console.log( 'dwm', diffWithMain);
			if(gitInfo[currentProjectName]?.commit !== r.state.HEAD.commit || gitInfo[currentProjectName]?.branch !== r.state.HEAD.name) {
				gitInfo[currentProjectName].commit = r.state.HEAD.commit;
				gitInfo[currentProjectName].branch = r.state.HEAD.name;
				updateAnnotationCommit(r.state.HEAD.commit, r.state.HEAD.name, r?.state?.remotes[0]?.fetchUrl);
			}
		});
		gitInfo[currentProjectName] = {
			repo: r?.state?.remotes[0]?.fetchUrl ? r?.state?.remotes[0]?.fetchUrl : r?.state?.remotes[0]?.pushUrl ? r?.state?.remotes[0]?.pushUrl : "",
			branch: r?.state?.HEAD?.name ? r?.state?.HEAD?.name : "",
			commit: r?.state?.HEAD?.commit ? r?.state?.HEAD?.commit : "",
			changes: await r?.diffBetween('origin/HEAD', r?.state?.HEAD?.name),
			modifiedAnnotations: []
		}
		console.log('gitInfo[proj]', gitInfo[currentProjectName])
	});
	adamiteLog.appendLine("huh?: " + gitApi.repositories[0]?.state?.remotes[0]?.fetchUrl)
	return gitInfo;
}


export const getProjectName = (filename?: string | undefined) : string => {
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

const translateAnnotationAnchorStandard = (annoInfo: any) : {[ key: string ] : any } => {

	return {
		id: annoInfo.id,
		annotation: annoInfo.annotation,
		anchors: [
			{
				anchor: {
					startLine: annoInfo.anchor ? annoInfo.anchor.startLine : annoInfo.startLine,
					startOffset: annoInfo.anchor ? annoInfo.anchor.startOffset : annoInfo.startOffset,
					endLine: annoInfo.anchor ? annoInfo.anchor.endLine : annoInfo.endLine,
					endOffset: annoInfo.anchor? annoInfo.anchor.endOffset : annoInfo.endOffset
				},
				anchorText: annoInfo.anchorText,
				html: annoInfo.html,
				filename: annoInfo.filename,
				gitUrl: annoInfo.gitUrl,
				stableGitUrl: annoInfo.stableGitUrl,
				visiblePath: annoInfo.visiblePath,
				anchorPreview: annoInfo.anchorPreview,
				programmingLang: annoInfo.programmingLang,
				anchorId: uuidv4(),
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
		selected: annoInfo.selected,
		needToUpdate: annoInfo.needToUpdate ? annoInfo.needToUpdate : false
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

export const createAnchorObject = async (annoId: string, range: vscode.Range) : Promise<AnchorObject | undefined> => {
	if(vscode.window.activeTextEditor) {
		const filename: string = vscode.window.activeTextEditor.document.uri.toString();
		const anchorText: string = vscode.window.activeTextEditor.document.getText(range);
		const html: string = await getShikiCodeHighlighting(filename, anchorText);
		const firstLineOfHtml: string = getFirstLineOfHtml(html, !anchorText.includes('\n'));
		const projectName: string = getProjectName(filename);
		const visiblePath: string = getVisiblePath(projectName, vscode.window.activeTextEditor.document.uri.fsPath)
		const gitUrl: string = getGithubUrl(visiblePath, projectName, false);
		const stableGitUrl: string = getGithubUrl(visiblePath, projectName, true);
		const programmingLang: string = vscode.window.activeTextEditor.document.uri.toString().split('.')[vscode.window.activeTextEditor.document.uri.toString().split('.').length - 1]
		return {
			parentId: annoId,
			anchorId: uuidv4(),
			anchorText,
			html,
			anchorPreview: firstLineOfHtml,
			originalCode: html,
			gitUrl,
			stableGitUrl,
			anchor: createAnchorFromRange(range),
			programmingLang,
			filename,
			visiblePath
		}
	}
	else {
		vscode.window.showInformationMessage('Must have open text editor!')
	}
}

export const buildAnchorObject = (anchorInfo: AnchorObject, range?: vscode.Range) : AnchorObject => {
	return range ? { ...anchorInfo, anchor: createAnchorFromRange(range) } : anchorInfo;
}