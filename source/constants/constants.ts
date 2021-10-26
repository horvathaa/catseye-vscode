import * as vscode from 'vscode';

export default class Annotation {
	id: string;
	filename: string | vscode.Uri;
	visiblePath: string;
	anchorText: string;
	annotation: string;
	startLine: number;
	endLine: number;
	startOffset: number;
	endOffset: number;
	deleted: boolean;
	outOfDate: boolean;
	html: string;
	authorId: string;
	createdTimestamp: number;
	programmingLang: string;
	gitRepo: string;
	gitBranch: string;
	gitCommit: string;
	anchorPreview: string;
	projectName: string;
	
	constructor(
			id: string, filename: string | vscode.Uri, visiblePath: string, anchorText: string, annotation: string, 
			anchorStartLine: number, anchorEndLine: number, anchorStartOffset: number, 
			anchorEndOffset: number, deleted: boolean, outOfDate: boolean, html: string, authorId: string,
			createdTimestamp: number, programmingLang: string, gitRepo: string, gitBranch: string, gitCommit: string,
			anchorPreview: string, projectName: string
		) 
	{
		this.id = id;
		this.filename = filename;
		this.visiblePath = visiblePath;
		this.anchorText = anchorText;
		this.annotation = annotation;
		this.startLine = anchorStartLine;
		this.endLine = anchorEndLine;
		this.startOffset = anchorStartOffset;
		this.endOffset = anchorEndOffset;
		this.deleted = deleted;
		this.outOfDate = outOfDate;
		this.html = html;
		this.authorId = authorId;
		this.createdTimestamp = createdTimestamp;
		this.programmingLang = programmingLang;
		this.gitRepo = gitRepo;
		this.gitBranch = gitBranch;
		this.gitCommit = gitCommit;
		this.anchorPreview = anchorPreview;
		this.projectName = projectName;
	}
}