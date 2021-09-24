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
	toDelete: boolean;
	html: string;
	
	constructor(id: string, filename: string | vscode.Uri, visiblePath: string, anchorText: string, annotation: string, anchorStartLine: number, anchorEndLine: number, anchorStartOffset: number, anchorEndOffset: number, toDelete: boolean, html: string) {
		this.id = id;
		this.filename = filename;
		this.visiblePath = visiblePath;
		this.anchorText = anchorText;
		this.annotation = annotation;
		this.startLine = anchorStartLine;
		this.endLine = anchorEndLine;
		this.startOffset = anchorStartOffset;
		this.endOffset = anchorEndOffset;
		this.toDelete = toDelete;
		this.html = html;
	}
}