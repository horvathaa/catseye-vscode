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
	html: string;
	authorId: string;
	createdTimestamp: number;
	programmingLang: string;
	
	constructor(
			id: string, filename: string | vscode.Uri, visiblePath: string, anchorText: string, annotation: string, 
			anchorStartLine: number, anchorEndLine: number, anchorStartOffset: number, 
			anchorEndOffset: number, deleted: boolean, html: string, authorId: string,
			createdTimestamp: number, programmingLang: string
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
		this.html = html;
		this.authorId = authorId;
		this.createdTimestamp = createdTimestamp;
		this.programmingLang = programmingLang;
	}
}