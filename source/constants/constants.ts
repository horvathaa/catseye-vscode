export class Annotation {
	id: string;
	annotation: string;
	anchors: AnchorObject[];
	deleted: boolean;
	outOfDate: boolean;
	authorId: string;
	createdTimestamp: number;
	gitRepo: string;
	gitBranch: string;
	gitCommit: string;
	projectName: string;
	githubUsername: string;
	replies: {[key: string]: any}[];
	outputs: {[key: string]: any}[];
	// originalCode: string;
	codeSnapshots: {[key: string]: any}[];
	sharedWith: string;
	selected: boolean;
	needToUpdate: boolean;

	constructor(
			id: string, 
			// filename: string | vscode.Uri, 
			// visiblePath: string, 
			// anchorText: string, 
			annotation: string, 
			anchors: AnchorObject[],
			// anchorStartLine: number, 
			// anchorEndLine: number, 
			// anchorStartOffset: number, 
			// anchorEndOffset: number, 
			deleted: boolean, 
			outOfDate: boolean, 
			// html: string, 
			authorId: string,
			createdTimestamp: number, 
			// programmingLang: string, 
			gitRepo: string, 
			gitBranch: string, 
			gitCommit: string,
			// gitUrl: string, 
			// stableGitUrl: string,
			// anchorPreview: string, 
			projectName: string, 
			githubUsername: string, 
			replies: {[key: string]: any}[],
			outputs: {[key: string]: any}[], 
			// originalCode: string, 
			codeSnapshots: {[key: string]: any}[], 
			sharedWith: string,
			selected: boolean,
			needToUpdate: boolean
		) 
	{
		this.id = id;
		// this.filename = filename;
		// this.visiblePath = visiblePath;
		// this.anchorText = anchorText;
		this.annotation = annotation;
		this.anchors = anchors;
		// this.startLine = anchorStartLine;
		// this.endLine = anchorEndLine;
		// this.startOffset = anchorStartOffset;
		// this.endOffset = anchorEndOffset;
		this.deleted = deleted;
		this.outOfDate = outOfDate;
		// this.html = html;
		this.authorId = authorId;
		this.createdTimestamp = createdTimestamp;

		this.gitRepo = gitRepo;
		this.gitBranch = gitBranch;
		this.gitCommit = gitCommit;
		// this.gitUrl = gitUrl;
		// this.stableGitUrl = stableGitUrl;
		// this.anchorPreview = anchorPreview;
		this.projectName = projectName;
		this.githubUsername = githubUsername;
		this.replies = replies;
		this.outputs = outputs;
		// this.originalCode = originalCode;
		this.codeSnapshots = codeSnapshots;
		this.sharedWith = sharedWith;
		this.selected = selected;
		this.needToUpdate = needToUpdate;
	}
}

export interface Anchor {
    startLine: number,
    endLine: number,
    startOffset: number,
    endOffset: number
}

export interface AnchorObject {
	anchor: Anchor,
	anchorText: string,
	html: string,
	filename: string,
	gitUrl: string,
	stableGitUrl: string,
	visiblePath: string,
	anchorPreview: string,
	programmingLang: string,
	anchorId: string,
	originalCode: string,
	parentId: string
}