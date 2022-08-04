import * as ts from 'typescript'
import * as vscode from 'vscode'
import { AST_DEBUG } from './astHelper'

export function getNodes(node: ts.Node) {
    const nodes: ts.Node[] = []
    ts.forEachChild(node, (cbNode) => {
        nodes.push(cbNode)
    })
    return nodes
}

function posToLine(scode: string, pos: number) {
    const code = scode.slice(0, pos).split('\n')
    return new vscode.Position(code.length - 1, code[code.length - 1].length)
}

export function nodeToRange(node: ts.Node, code: string): vscode.Range {
    return new vscode.Range(
        posToLine(code, node.pos),
        posToLine(code, node.end)
    )
}

function rangeToOffset(
    document: vscode.TextDocument,
    range: vscode.Range
): number {
    const rangeOffset = new vscode.Range(
        0,
        0,
        range.start.line,
        range.start.character
    )
    return document.getText(rangeOffset).length
}

export interface CodeContext {
    nodeType: string
    range?: vscode.Range
    identifierName: string
    identifierType?: string
    identifierValue?: string
    distanceFromRange: number
    isDirectParent: boolean
    originalNode?: ts.Node
    parameters?: string
    elseStatement?: boolean
    implements?: string
    array?: CodeContext[]
    leftOperand?: string
    rightOperand?: string
    operator?: string
}

export function handleNodeDataExtraction(
    node: ts.Node,
    document: vscode.TextDocument,
    activeSelection: vscode.Range,
    path: ts.Node[],
    code: string,
    i: number
): CodeContext {
    const isDirectParent: boolean =
        nodeToRange(node, code).contains(activeSelection) ||
        (i < path.length - 1 &&
            rangeToOffset(document, activeSelection) - node.end ===
                rangeToOffset(document, activeSelection) - path[i + 1].end &&
            ts.SyntaxKind[path[i + 1].kind] === 'Block')
    let info: CodeContext = {
        nodeType: ts.SyntaxKind[node.kind],
        // range: nodeToRange(node, code),
        identifierName: '',
        identifierType: '',
        identifierValue: '',
        distanceFromRange: rangeToOffset(document, activeSelection) - node.end,
        isDirectParent: isDirectParent,
        // originalNode: node,
        parameters: '',
    }
    // console.log('is interface', ts.isInterfaceDeclaration(node))
    info = addTsMetadata(info, node, code, document, path, i, activeSelection)
    return info
}

export function addTsMetadata(
    info: CodeContext,
    node: ts.Node,
    code: string,
    document: vscode.TextDocument,
    path: ts.Node[],
    i: number,
    activeSelection?: vscode.Range
): CodeContext {
    if (ts.isArrowFunction(node)) {
        const prevNode = path[i - 1]
        if (ts.isIdentifier(prevNode)) {
            info.identifierName = prevNode.text
        } else {
            info.identifierName = ''
        }
        info.identifierType = ts.SyntaxKind[node.kind]
        info.parameters = node.parameters
            .map((n) => document.getText(nodeToRange(n, code)))
            .join()
            .trim()
    } else if (ts.isFunctionDeclaration(node)) {
        info.identifierType = ts.SyntaxKind[node.kind]
        info.identifierName = node.name?.text ? node.name?.text : ''
        info.parameters = node.parameters
            .map((n) => document.getText(nodeToRange(n, code)))
            .join()
            .trim()
    } else if (
        ts.isIfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isCaseClause(node)
    ) {
        info.identifierType = ts.SyntaxKind[node.kind]
        info.identifierValue = document
            .getText(nodeToRange(node.expression, code))
            .trim()
        info.elseStatement =
            ts.isIfStatement(node) && node.elseStatement && activeSelection
                ? nodeToRange(node.elseStatement, code).contains(
                      activeSelection
                  )
                : false
    } else if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        info.identifierName = node.name ? node.name.text : ''
        info.identifierType = ts.SyntaxKind[node.kind]
        info.implements = node.heritageClauses
            ? node.heritageClauses
                  .map(
                      (h) =>
                          ts.isIdentifier(h.types[0].expression) &&
                          h.types[0].expression.text
                  )
                  .join()
            : ''
    } else if (ts.isTypeReferenceNode(node)) {
        info.identifierName = ts.isIdentifier(node.typeName)
            ? node.typeName.text
            : ''
        info.identifierType = ts.SyntaxKind[node.kind]
    } else if (
        ts.isPropertyAssignment(node) ||
        ts.isVariableDeclaration(node)
    ) {
        info.identifierName = ts.isIdentifier(node.name) ? node.name.text : ''
        info.identifierValue = node.initializer
            ? document.getText(nodeToRange(node.initializer, code)).trim()
            : ts.SyntaxKind[node.kind]
    } else if (ts.isCallExpression(node)) {
        info.identifierName = document
            .getText(nodeToRange(node.expression, code))
            .trim()
        info.identifierType = ts.SyntaxKind[node.kind]
        info.parameters = node.arguments
            .map((n) => document.getText(nodeToRange(n, code)))
            .join()
    } else if (ts.isObjectLiteralExpression(node)) {
        info.identifierName = node.properties
            .map((p) => (p.name && ts.isIdentifier(p.name) ? p.name.text : ''))
            .join()
        info.identifierValue = node.properties
            .map((p) =>
                ts.isPropertyAssignment(p)
                    ? document.getText(nodeToRange(p.initializer, code))
                    : ''
            )
            .join()
    } else if (ts.isPropertyAccessExpression(node)) {
        info.identifierName = ts.isIdentifier(node.expression)
            ? node.expression.text
            : document.getText(nodeToRange(node.expression, code)).trim()
        info.identifierValue = node.name.text
    } else if (ts.isBinaryExpression(node)) {
        info.identifierValue = document
            .getText(
                new vscode.Range(
                    posToLine(code, node.left.pos),
                    posToLine(code, node.right.end)
                )
            )
            .trim()
        info.leftOperand = ts.isIdentifier(node.left)
            ? node.left.text
            : document
                  .getText(
                      new vscode.Range(
                          posToLine(code, node.left.pos),
                          posToLine(code, node.left.end)
                      )
                  )
                  .trim()
        info.rightOperand = ts.isIdentifier(node.right)
            ? node.right.text
            : document
                  .getText(
                      new vscode.Range(
                          posToLine(code, node.right.pos),
                          posToLine(code, node.right.end)
                      )
                  )
                  .trim()
        info.operator = ts.SyntaxKind[node.operatorToken.kind]
    } else if (ts.isStringLiteral(node)) {
        info.identifierValue = node.text
        info.identifierName = ts.SyntaxKind[node.kind]
    } else if (ts.isIdentifier(node)) {
        // console.log('identifier node', node)
        info.identifierName = node.text
        info.identifierValue = document.getText(nodeToRange(node, code)).trim()
    } else if (ts.isParameter(node)) {
        // console.log('parameter node', node)
        info.identifierType = ts.SyntaxKind[node.name.kind]
        info.identifierName = ts.isIdentifier(node.name)
            ? node.name.text
            : document.getText(nodeToRange(node.name, code)).trim()
        info.identifierValue =
            node.type &&
            ts.isTypeReferenceNode(node.type) &&
            ts.isIdentifier(node.type.typeName)
                ? node.type.typeName.text
                : document.getText(nodeToRange(node, code)).trim()
    } else if (ts.isExpressionStatement(node)) {
        // console.log('expression node', node)
        info.identifierValue = ts.isIdentifier(node.expression)
            ? node.expression.text
            : document.getText(nodeToRange(node, code)).trim()
        info.identifierType = ts.SyntaxKind[node.expression.kind]
    } else if (ts.isArrayLiteralExpression(node)) {
        info.array =
            activeSelection &&
            node.elements.map((e) =>
                handleNodeDataExtraction(
                    e,
                    document,
                    activeSelection,
                    path,
                    code,
                    i
                )
            )
    }

    return info
}

export function generatePath(
    tsSource: ts.SourceFile,
    range: vscode.Range
): ts.Node[] {
    const code = tsSource.text
    const nodes = getNodes(tsSource)
    const nodeData = nodes.map((n, i) => {
        return {
            node: n,
            range: nodeToRange(n, code),
            children: getNodes(n),
        }
    })
    const parent = nodeData.find((r) => r.range.contains(range))
    if (parent) {
        // let root: ts.Node[] = parent.children
        let root = [parent.node]
        let path: ts.Node[] = [parent.node]
        do {
            let candidates = root.filter((c: ts.Node) => {
                let range = nodeToRange(c, code)
                return range.contains(range)
            })
            let candidateNodes: any[] = []
            candidates.forEach((c: any) => candidateNodes.push(getNodes(c)))
            let flat: ts.Node[] = [].concat(...candidateNodes)
            path = path.concat(...flat)
            root = flat
        } while (root.length)
        // console.log('path??', path)
        return path
    }
    AST_DEBUG &&
        console.error('Could not make path - could not find parent node')
    return []
}
