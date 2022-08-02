import * as vscode from 'vscode'
import * as ts from 'typescript'
import { AnchorObject, Annotation } from '../constants/constants'
import {
    buildAnnotation,
    getAnnotationsNotWithGitUrl,
    getAnnotationsWithStableGitUrl,
    getStableGitHubUrl,
} from '../utils/utils'
import {
    CodeContext,
    generatePath,
    getNodes,
    handleNodeDataExtraction,
    nodeToRange,
} from './nodeHelper'
import { createRangeFromAnchorObject } from '../anchorFunctions/anchor'
import { annotationList } from '../extension'

interface SourceFile {
    localFileName: string
    gitUrl: string
    tsSourceFile: ts.SourceFile
}

export class AstHelper {
    private __sourceFiles: SourceFile[]

    constructor(document?: vscode.TextDocument) {
        if (document) {
            this.__sourceFiles = [
                {
                    localFileName: document.fileName,
                    gitUrl: getStableGitHubUrl(document.uri.fsPath),
                    tsSourceFile: ts.createSourceFile(
                        document.fileName,
                        document.getText(),
                        ts.ScriptTarget.Latest
                    ),
                },
            ]
        } else {
            this.__sourceFiles = []
        }
    }

    private createSourceFile(document: vscode.TextDocument) {
        return {
            localFileName: document.fileName,
            gitUrl: getStableGitHubUrl(document.uri.fsPath),
            tsSourceFile: ts.createSourceFile(
                document.fileName,
                document.getText(),
                ts.ScriptTarget.Latest
            ),
        }
    }

    private isTsJsJsxTsx(document: vscode.TextDocument) {
        return (
            [
                'typescript',
                'javascript',
                'typescriptreact',
                'javascriptreact',
            ].indexOf(document.languageId) > -1
        )
    }

    private createNewSourceFile(
        document: vscode.TextDocument
    ): SourceFile | undefined {
        if (this.isTsJsJsxTsx(document)) return this.createSourceFile(document)
    }

    private refreshSourceFile(
        document: vscode.TextDocument,
        sourceFile: SourceFile
    ): SourceFile {
        return {
            ...sourceFile,
            tsSourceFile: ts.createSourceFile(
                document.fileName,
                document.getText(),
                ts.ScriptTarget.Latest
            ),
        }
    }

    public checkIsSourceFileIsWatched(document: vscode.TextDocument): boolean {
        const url = getStableGitHubUrl(document.uri.fsPath)
        return this.__sourceFiles.map((t) => t.gitUrl).includes(url)
    }

    public addSourceFile(
        document: vscode.TextDocument
    ): SourceFile | undefined {
        const sourceFile = this.createNewSourceFile(document)
        if (sourceFile && !this.checkIsSourceFileIsWatched(document)) {
            this.__sourceFiles = [...this.__sourceFiles, sourceFile]
        }
        return sourceFile
    }

    private findSourceFile(
        document: vscode.TextDocument
    ): SourceFile | undefined {
        let tsSource = this.__sourceFiles.find(
            (f: SourceFile) =>
                f.gitUrl === getStableGitHubUrl(document.uri.fsPath)
        )

        // if (!tsSource) {
        //     tsSource = this.addSourceFile(document)
        // }
        return tsSource
    }

    public updatePaths(document: vscode.TextDocument): Annotation[] {
        const gitUrl = getStableGitHubUrl(document.uri.fsPath)
        const annotationsToUpdate = getAnnotationsWithStableGitUrl(
            annotationList,
            gitUrl
        )
        this.refreshFile(document)
        return annotationsToUpdate
            .map((a) => this.buildPathForAnnotation(a, document))
            .concat(getAnnotationsNotWithGitUrl(annotationList, gitUrl))
    }

    private buildPathForAnnotation(
        annotation: Annotation,
        // gitUrl: string,
        document: vscode.TextDocument
    ): Annotation {
        return buildAnnotation({
            ...annotation,
            anchors: annotation.anchors.map((anch) =>
                this.buildPathForAnchor(anch, document)
            ),
            needToUpdate: true,
        })
    }

    private buildPathForAnchor(
        anchor: AnchorObject,
        // gitUrl: string
        document: vscode.TextDocument
    ): AnchorObject {
        const source = this.findSourceFile(document)
        if (source) {
            const anchorRange = createRangeFromAnchorObject(anchor)
            const path = generatePath(source.tsSourceFile, anchorRange)
            const nodeInfo = path.map((p, i) => {
                return handleNodeDataExtraction(
                    p,
                    document,
                    anchorRange,
                    path,
                    source.tsSourceFile.text,
                    i
                )
            })
            return {
                ...anchor,
                path: nodeInfo.filter((p) => p.isDirectParent),
            }
        }
        console.error('Could not create path')
        return anchor
    }

    public generateCodeContextPath(
        range: vscode.Range,
        document: vscode.TextDocument
    ): CodeContext[] {
        this.refreshFile(document)
        const source = this.findSourceFile(document)
        if (source) {
            const path = generatePath(source.tsSourceFile, range)
            return path
                .map((p, i) => {
                    return handleNodeDataExtraction(
                        p,
                        document,
                        range,
                        path,
                        source.tsSourceFile.text,
                        i
                    )
                })
                .filter((n) => n.isDirectParent)
        }
        console.error('Could not create CodeContext[]')
        return []
    }

    public refreshFile(document: vscode.TextDocument) {
        let source = this.findSourceFile(document)
        if (source) {
            this.__sourceFiles = [
                ...this.__sourceFiles.filter(
                    (sf) =>
                        sf.gitUrl !== getStableGitHubUrl(document.uri.fsPath)
                ),
                this.refreshSourceFile(document, source),
            ]
        } else {
            this.addSourceFile(document)
        }
    }

    public findMostSimilarPath(
        document: vscode.TextDocument,
        path: CodeContext[]
    ) {
        this.refreshFile(document)
        let source = this.findSourceFile(document)
        if (source) {
            const code = source.tsSourceFile.text
            const nodes = getNodes(source.tsSourceFile)
            const nodeData = nodes.map((n: ts.Node) => {
                return {
                    node: n,
                    range: nodeToRange(n, code),
                    children: getNodes(n),
                    kind: ts.SyntaxKind[n.kind],
                }
            })
        }
    }
}
