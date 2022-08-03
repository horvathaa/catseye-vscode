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
import { safeToCompare, similarity } from './astUtils'
interface SourceFile {
    localFileName: string
    gitUrl: string
    tsSourceFile: ts.SourceFile
}

interface WeightedCodeContext extends CodeContext {
    weight: number
    originalIndex: number
    tsNode: ts.Node
}

export const AST_DEBUG = false
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

    public buildPathForAnnotation(
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
        if (!this.isTsJsJsxTsx(document)) {
            return anchor
        }
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
        AST_DEBUG && console.error('Could not create path') // only throw this error if it's a file we should bother finding i.e., js/ts file
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
            const newPath = path
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
            return newPath
        }

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

    // https://stackoverflow.com/questions/42284139/how-to-get-a-subtree-given-a-path-from-a-tree-object
    // consider subtree traversal
    public findMostSimilarPath(
        document: vscode.TextDocument,
        path: CodeContext[]
    ) {
        this.refreshFile(document)
        let source = this.findSourceFile(document)
        if (source) {
            const code = source.tsSourceFile.text
            let newPath = []
            let nodes: ts.Node[] = getNodes(source.tsSourceFile)
            let i = 0
            do {
                const nodeData: WeightedCodeContext[] = nodes.map(
                    (n: ts.Node, i: number) => {
                        return {
                            ...handleNodeDataExtraction(
                                n,
                                document,
                                nodeToRange(n, code),
                                nodes,
                                code,
                                i
                            ),
                            originalIndex: i,
                            weight: 0,
                            tsNode: n,
                        }
                    }
                )
                const weightedNodeData = nodeData.map((n) =>
                    this.weighCodeContextNode(i, n, path)
                )

                const sortedNodeData = this.compareCodeContextNodes(
                    weightedNodeData,
                    path[i],
                    path,
                    i
                )
                newPath.push(weightedNodeData[0])
                nodes = getNodes(nodes[sortedNodeData[0].originalIndex])
                i += 1
            } while (nodes.length) // this will probably need to be changed to account for cases where the new anchor is "deeper" than the old anchor
            console.log('path???', newPath)
        }
    }

    private compareCodeContextNodes(
        path: WeightedCodeContext[],
        originalNode: CodeContext,
        originalPath: CodeContext[],
        i: number
    ): WeightedCodeContext[] {
        return path.sort((a, b) => {
            return a.weight < b.weight
                ? -1
                : a.weight === b.weight
                ? this.handleTies(a, b, originalNode, originalPath, i)
                : 1
        })
    }

    // continue adding heuristics to this
    private handleTies(
        a: WeightedCodeContext,
        b: WeightedCodeContext,
        originalNode: CodeContext,
        path: CodeContext[],
        i: number
    ): number {
        const isBlock =
            a.nodeType === 'Block' && b.nodeType !== 'Block' ? -1 : 0 // favor nodes that are more likely to have child nodes to explore

        const weightA = path
            .map((node: CodeContext) => {
                return this.computeNodeToNode(node, a, i)
            })
            .reduce((partialSum, num) => partialSum + num, 0)
        const weightB = path
            .map((node: CodeContext) => {
                return this.computeNodeToNode(node, b, i)
            })
            .reduce((partialSum, num) => partialSum + num, 0)

        return isBlock + (weightA - weightB)
    }

    private computeNodeToNode(
        originalNode: CodeContext,
        pathNode: WeightedCodeContext,
        i: number
    ): number {
        const sameNodeType =
            originalNode.nodeType === pathNode.nodeType ? -1 : 0
        const identifierNameWeight =
            safeToCompare(
                originalNode.identifierName,
                pathNode.identifierName
            ) && originalNode.identifierName === pathNode.identifierName
                ? -1
                : safeToCompare(
                      originalNode.identifierName,
                      pathNode.identifierName
                  )
                ? -1 *
                  similarity(
                      originalNode.identifierName,
                      pathNode.identifierName
                  )
                : 0
        const sameIdentifierType =
            safeToCompare(
                originalNode.identifierType,
                pathNode.identifierType
            ) && originalNode.identifierType === pathNode.identifierType
                ? -1
                : 0
        const identifierValue =
            safeToCompare(
                originalNode.identifierValue,
                pathNode.identifierValue
            ) && originalNode.identifierValue === pathNode.identifierValue
                ? -1
                : safeToCompare(
                      originalNode.identifierValue,
                      pathNode.identifierValue
                  )
                ? -1 *
                  similarity(
                      originalNode.identifierValue
                          ? originalNode.identifierValue
                          : '',
                      pathNode.identifierValue ? pathNode.identifierValue : ''
                  )
                : 0 // would be better if we check whether any of the original node's values appear in the path node and weight that as stronger than 0

        return (
            sameNodeType +
            identifierNameWeight +
            sameIdentifierType +
            identifierValue
        )
    }

    private computeFuzzyPathWeight(
        pathNode: WeightedCodeContext,
        originalPath: CodeContext[],
        i: number
    ) {
        return originalPath
            .map((node: CodeContext) => {
                // console.log(
                //     'comparing this from original path',
                //     node,
                //     'to this (node we are currently evaluating)',
                //     pathNode
                // )
                const lol = this.computeNodeToNode(node, pathNode, i)
                // console.log('got this value', lol)
                return lol
            })
            .reduce((partialSum, num) => partialSum + num, 0)
    }

    private computeWeight(
        originalNode: CodeContext,
        pathNode: WeightedCodeContext,
        originalPath: CodeContext[],
        i: number
    ): number {
        const fuzzyPathValue = this.computeFuzzyPathWeight(
            pathNode,
            originalPath,
            i
        )

        const nodeToNodeWeight = this.computeNodeToNode(
            originalNode,
            pathNode,
            i
        )

        const numChildrenToPath =
            -1 * (originalPath.length - (getNodes(pathNode.tsNode).length - i))
        return (
            2 * nodeToNodeWeight + 5 * fuzzyPathValue - 1.25 * numChildrenToPath // these weights are p much arbitrary and should be changed
        )
    }

    // smaller the value, the more similar the nodes are
    private weighCodeContextNode(
        i: number,
        pathNode: WeightedCodeContext,
        originalPath: CodeContext[]
    ): WeightedCodeContext {
        const originalNode = originalPath[i]
        return {
            ...pathNode,
            weight: originalNode
                ? this.computeWeight(originalNode, pathNode, originalPath, i)
                : this.computeFuzzyPathWeight(pathNode, originalPath, i),
        }
    }
}
