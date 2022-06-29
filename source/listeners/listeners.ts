/*
 *
 * listeners.ts
 * Callback functions for various VS Code events
 *
 */

import * as vscode from 'vscode'
import * as ts from 'typescript'
import {
    annotationList,
    copiedAnnotations,
    tempAnno,
    setTempAnno,
    setTabSize,
    user,
    view,
    setActiveEditor,
    setAnnotationList,
    deletedAnnotations,
    setDeletedAnnotationList,
    setInsertSpaces,
    changes,
    setChangeEvents,
    incrementNumChangeEventsCompleted,
    numChangeEventsCompleted,
    setCurrentColorTheme,
    gitInfo,
    currentGitHubProject,
    gitApi,
    tsFiles,
    setTsFiles,
    floatingDecorations
} from '../extension'
import * as anchor from '../anchorFunctions/anchor'
import * as utils from '../utils/utils'
import {
    Annotation,
    AnchorObject,
    ChangeEvent,
    // Timer
} from '../constants/constants'
import { WhatsApp } from '@mui/icons-material'
let timeSinceLastEdit: number = -1
let tempChanges: any[] = []
// Update our internal representation of the color theme so Shiki (our package for code formatting) uses appropriate colors
export const handleDidChangeActiveColorTheme = (
    colorTheme: vscode.ColorTheme
) => {
    // give editor time to update...
    setTimeout(() => {
        setCurrentColorTheme(
            vscode.workspace.getConfiguration(
                'workbench',
                vscode.workspace.workspaceFolders &&
                    vscode.workspace.workspaceFolders[0].uri
            ).colorTheme
        )
    }, 3000)
}

// Listens for a change in visible editors so we can highlight correct anchors for all visible files
export const handleChangeVisibleTextEditors = (
    textEditors: readonly vscode.TextEditor[]
) => {
    // const textEditorFileNames = textEditors.map(t => t.document.uri.toString());
    const textEditorProjectFileNames = textEditors.map((t) =>
        utils.getStableGitHubUrl(t.document.uri.fsPath)
    )
    const annotationsToHighlight = annotationList.filter((a) => {
        // const filenames = utils.getAllAnnotationFilenames([a]);
        const gitUrls = utils.getAllAnnotationStableGitUrls([a])
        return textEditorProjectFileNames.some((t) => gitUrls.includes(t))
    })

    if (!annotationsToHighlight.length) return
    if (view) {
        textEditors.forEach((t) =>
            anchor.addHighlightsToEditor(annotationsToHighlight, t)
        )
    }
}

// update Adamite pane such that annotations are in the correct project and file lists
export const handleChangeActiveTextEditor = (
    TextEditor: vscode.TextEditor | undefined
) => {
    if (vscode.workspace.workspaceFolders) {
        if (TextEditor) {
            if (TextEditor.options?.tabSize)
                setTabSize(TextEditor.options.tabSize)
            if (TextEditor.options?.insertSpaces)
                setInsertSpaces(TextEditor.options.insertSpaces)
            setAnnotationList(utils.sortAnnotationsByLocation(annotationList))
            const currentProject: string = utils.getProjectName(
                TextEditor.document.uri.fsPath
            )
            const gitUrl: string = utils.getGithubUrl(
                TextEditor.document.uri.fsPath,
                currentProject,
                true
            )
            if (
                gitInfo[currentProject] &&
                currentGitHubProject !== gitInfo[currentProject].repo
            ) {
                utils.updateCurrentGitHubProject(gitApi)
                utils.updateCurrentGitHubCommit(gitApi)
            }
            if(
                ['typescript', 'javascript', 'typescriptreact', 'javascriptreact']
                .indexOf(TextEditor.document.languageId) > -1
            ) {
                !tsFiles.map(t => t.localFileName).includes(TextEditor.document.fileName) && 
                    setTsFiles(
                        [ ... tsFiles, 
                        { localFileName: TextEditor.document.fileName, tsSourceFile: ts.createSourceFile(TextEditor.document.fileName, TextEditor.document.getText(), ts.ScriptTarget.Latest) 
                    } ]);
                console.log(tsFiles);  
            }
            // console.log('changing active text editor');
            if (user && vscode.workspace.workspaceFolders)
                view?.updateDisplay(undefined, gitUrl, currentProject)
        }
    }
    setActiveEditor(TextEditor)
}

// In case where user saves or closes a window, save annotations to FireStore
export const handleDidSaveDidClose = (TextDocument: vscode.TextDocument) => {
    const gitUrl = utils.getStableGitHubUrl(TextDocument.uri.fsPath)
    if (vscode.workspace.workspaceFolders)
        utils.handleSaveCloseEvent(
            annotationList,
            vscode.workspace.workspaceFolders[0].uri.path + '/test.json',
            gitUrl,
            TextDocument
        )
}

const logChanges = (e: vscode.TextDocumentChangeEvent): void => {
    let currentTime = new Date().getTime()
    const projectName: string = utils.getProjectName(e.document.uri.toString())
    if (timeSinceLastEdit === -1 || currentTime - timeSinceLastEdit <= 2000) {
        timeSinceLastEdit = currentTime
        tempChanges.push({
            text: e.contentChanges
                .map((c) =>
                    c.text !== ''
                        ? c.text
                        : `Delete: removed ${c.rangeLength} characters`
                )
                .join(' '),
            file: e.document.fileName,
            lines: e.contentChanges
                .map((c) =>
                    c.range.start.line !== c.range.end.line
                        ? c.range.start.line + ' to ' + c.range.end.line
                        : `${c.range.start.line}`
                )
                .join(' '),
            characterChanges: e.contentChanges.flatMap((c) => {
                return { added: c.text.length, removed: c.rangeLength }
            }),
        })
    } else if (currentTime - timeSinceLastEdit >= 2000) {
        timeSinceLastEdit = -1
        const characterData = tempChanges.flatMap((a) => a.characterChanges)
        setChangeEvents([
            ...changes,
            {
                time: currentTime,
                textAdded: tempChanges.map((t) => t.text).join(''),
                commit: gitInfo[projectName].commit,
                branch: gitInfo[projectName].branch,
                file: [...new Set(tempChanges.map((t) => t.file))].join('; '),
                line: [...new Set(tempChanges.map((t) => t.lines))].join('; '),
                charactersAdded: characterData.reduce(
                    (accumulator, t) => accumulator + t.added,
                    0
                ),
                charactersRemoved: characterData.reduce(
                    (accumulator, t) => accumulator + t.removed,
                    0
                ),
            },
        ])
        tempChanges = []
    }
}

// When user edits a document, update corresponding annotations
export const handleDidChangeTextDocument = (
    e: vscode.TextDocumentChangeEvent
) => {
    // console.log('e', e);

    // logChanges(e);
    if (e.document.fileName.includes('extension-output-')) return // this listener also gets triggered when the output pane updates???? for some reason????

    const stableGitPath = utils.getStableGitHubUrl(e.document.uri.fsPath)

    // const currentAnnotations = utils.getAllAnnotationsWithAnchorInFile(annotationList, e.document.uri.toString());
    const currentAnnotations = utils.getAllAnnotationsWithGitUrlInFile(
        annotationList,
        stableGitPath
    )
    const couldBeUndoOrPaste =
        utils.getAllAnnotationsWithGitUrlInFile(
            deletedAnnotations,
            stableGitPath
        ).length > 0 || copiedAnnotations.length > 0
    if (!currentAnnotations.length && !tempAnno && !couldBeUndoOrPaste) {
        return
    } // no annotations could possibly be affected by this change
    else {
        let translatedAnnotations: Annotation[] = currentAnnotations
        let rangeAdjustedAnnotations: Annotation[] = []
        for (const change of e.contentChanges) {
            const startLine = change.range.start.line
            const endLine = change.range.end.line
            const linesInRange = endLine - startLine
            const linesInserted = change.text.split('\n').length - 1
            const diff = linesInserted - linesInRange

            // check to see if user pasted a copied or previously-deleted annotation...
            if (
                utils.didUserPaste(change.text) &&
                copiedAnnotations.length &&
                change.text.length
            ) {
                // make sure this isn't a cut w/o paste
                if (vscode.workspace.workspaceFolders) {
                    rangeAdjustedAnnotations = utils.reconstructAnnotations(
                        copiedAnnotations,
                        change.text,
                        change.range,
                        e.document.uri,
                        vscode.workspace.workspaceFolders[0].uri,
                        e.document
                    )
                }
            }
            // check to see if there's any deleted annotations that may be brought back
            else if (deletedAnnotations.length) {
                const deletedAnnos = utils.checkIfChangeIncludesAnchor(
                    deletedAnnotations,
                    change.text
                )
                const currAnnoIds: string[] = currentAnnotations.map(
                    (a) => a.id
                )
                if (deletedAnnos.length && vscode.workspace.workspaceFolders) {
                    deletedAnnos.forEach((a: Annotation) => {
                        a.deleted = false
                        a.outOfDate = false
                    })
                    rangeAdjustedAnnotations = deletedAnnos
                    const deletedIds = deletedAnnos.map((a) => a.id)
                    setDeletedAnnotationList(
                        deletedAnnotations.filter(
                            (a: Annotation) => !deletedIds?.includes(a.id)
                        )
                    ) // undo stack has been popped
                }
                // probably did a cut paste which brought the anno back -- refresh list
                else if (
                    deletedAnnotations.filter((a) => currAnnoIds.includes(a.id))
                        .length
                ) {
                    setDeletedAnnotationList(
                        deletedAnnotations.filter(
                            (a) => !currAnnoIds.includes(a.id)
                        )
                    )
                }
            }

            // update and remove any annotation given the translate change handler in anchor.ts
            // mark any annotation that has changed for saving to FireStore
            translatedAnnotations = utils.removeOutOfDateAnnotations(
                translatedAnnotations.map((a: Annotation) => {
                    const [anchorsToTranslate, anchorsNotToTranslate] =
                        utils.partition(
                            a.anchors,
                            // (a: AnchorObject) => a.filename === e.document.uri.toString()
                            (a: AnchorObject) =>
                                a.stableGitUrl === stableGitPath
                        )
                    const translate = anchorsToTranslate.map(
                        (a: AnchorObject) =>
                            anchor.translateChanges(
                                a,
                                change.range,
                                change.text.length,
                                diff,
                                change.rangeLength,
                                e.document,
                                change.text
                            )
                    )
                    const translatedAnchors = utils.removeNulls(translate)
                    const needToUpdate = translatedAnchors.some((t) => {
                        const anchor = anchorsToTranslate.find(
                            (o: AnchorObject) => t.anchorId === o.anchorId
                        )
                        return !utils.objectsEqual(anchor.anchor, t.anchor)
                    })
                    return utils.buildAnnotation({
                        ...a,
                        needToUpdate,
                        anchors: [
                            ...translatedAnchors,
                            ...anchorsNotToTranslate,
                        ],
                    })
                })
            )

            // if user is creating an annotation at edit time, update that annotation too
            if (
                tempAnno &&
                tempAnno.anchors[0].stableGitUrl === stableGitPath
            ) {
                const newAnchor = anchor.translateChanges(
                    tempAnno.anchors[0],
                    change.range,
                    change.text.length,
                    diff,
                    change.rangeLength,
                    e.document,
                    change.text
                )
                if (newAnchor)
                    setTempAnno({ ...tempAnno, anchors: [newAnchor] })
            }
        }

        const notUpdatedAnnotations: Annotation[] =
            utils.getAnnotationsNotWithGitUrl(annotationList, stableGitPath)
        const newAnnotationList: Annotation[] = translatedAnnotations.concat(
            notUpdatedAnnotations,
            rangeAdjustedAnnotations
        )

        // highlight changed annotations
        if (vscode.window.activeTextEditor && view) {
            anchor.addHighlightsToEditor(
                newAnnotationList,
                vscode.window.activeTextEditor
            )
        } else {
            setAnnotationList(
                utils.sortAnnotationsByLocation(newAnnotationList)
            )
        }
    }
}

interface NodeData {
    node: ts.Node,
    range: vscode.Range,
    indices: number[],

}

function getNodes(node: ts.Node) {
    const nodes: ts.Node[] = [];
    ts.forEachChild(node, cbNode => {
        nodes.push(cbNode);
    });
    return nodes;
}

function nodeToRange(node: ts.Node, code: string) : vscode.Range {
    return new vscode.Range(posToLine(code, node.pos), posToLine(code, node.end));
}

function posToLine(scode: string, pos: number) {
    const code = scode.slice(0, pos).split('\n');
    return new vscode.Position(code.length - 1, code[code.length - 1].length);
}

function rangeToOffset(document: vscode.TextDocument, range: vscode.Range) : number {
    const rangeOffset = new vscode.Range(0, 0, range.start.line, range.start.character);
    return document.getText(rangeOffset).length;
}

interface Scope {
    type: string
    name?: string
    isDirectParent: boolean
}

interface CatseyeIdentifier {
    name: string
    type: string
    distance: number
}

interface SurroundingContext {
    identifiers: CatseyeIdentifier[]
    scopes: Scope[]
}

interface CodeContext {
    nodeType: string
    identifierName: string
    identifierType?: string
    identifierValue?: string
    distanceFromRange: number
    isDirectParent: boolean
    originalNode: ts.Node
    parameters?: string
    implements?: string
    array?: CodeContext[]
    leftOperand?: string
    rightOperand?: string
    operator?: string
}

function handleNodeDataExtraction(
    node: ts.Node, 
    textEditor: vscode.TextEditor, 
    activeSelection: vscode.Selection, 
    path: ts.Node[], 
    code: string, 
    i: number
) : CodeContext {
    const isDirectParent: boolean = nodeToRange(node, code).contains(activeSelection) || 
    ((i < (path.length - 1)) && (rangeToOffset(
        textEditor.document, 
        activeSelection
    ) - node.end) === (rangeToOffset(
        textEditor.document, 
        activeSelection
    ) - path[i+1].end) && ts.SyntaxKind[path[i+1].kind] === 'Block')
    let info: CodeContext = {
        nodeType: ts.SyntaxKind[node.kind],
        identifierName: "",
        identifierType: "",
        identifierValue: "",
        distanceFromRange: rangeToOffset(
            textEditor.document, 
            activeSelection
            ) - node.end,
        isDirectParent: isDirectParent,
        originalNode: node,
        parameters: ""
    }
    // console.log('is interface', ts.isInterfaceDeclaration(node))

    if(ts.isArrowFunction(node)) {
        const prevNode = path[i-1]
        if(ts.isIdentifier(prevNode)) {
            info.identifierName = prevNode.text
        }
        else {
            info.identifierName = ""
        }
        info.identifierType = ts.SyntaxKind[node.kind]
        info.parameters = node.parameters.map(n => textEditor.document.getText(nodeToRange(n, code))).join()
    }
    else if(ts.isFunctionDeclaration(node)) {
        info.identifierType = ts.SyntaxKind[node.kind]
        info.identifierName = node.name?.text ? node.name?.text : "" 
        info.parameters = node.parameters.map(n => textEditor.document.getText(nodeToRange(n, code))).join()
    }
    else if(ts.isIfStatement(node) || ts.isSwitchStatement(node) || ts.isCaseClause(node)) {
        console.log(ts.SyntaxKind[node.expression.kind])
        info.identifierType = ts.SyntaxKind[node.kind]
        info.identifierValue = textEditor.document.getText(nodeToRange(node.expression, code)).trim()
    }
    else if(ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        info.identifierName =  node.name ? node.name.text : ""
        info.identifierType = ts.SyntaxKind[node.kind]
        info.implements = node.heritageClauses ? node.heritageClauses.map(h => ts.isIdentifier(h.types[0].expression) &&  h.types[0].expression.text).join() : ""
    }
    else if(ts.isTypeReferenceNode(node)) {
        info.identifierName = ts.isIdentifier(node.typeName) ? node.typeName.text : ""
        info.identifierType = ts.SyntaxKind[node.kind]
    }
    else if(ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) {
        info.identifierName = ts.isIdentifier(node.name) ? node.name.text : ""
        info.identifierValue = node.initializer ? textEditor.document.getText(nodeToRange(node.initializer, code)).trim() :
            ts.SyntaxKind[node.kind]
    }
    else if(ts.isCallExpression(node)) {
        info.identifierName = textEditor.document.getText(nodeToRange(node.expression, code)).trim()
        info.identifierType = ts.SyntaxKind[node.kind]
        info.parameters = node.arguments.map(n => textEditor.document.getText(nodeToRange(n, code))).join()
    }
    else if(ts.isObjectLiteralExpression(node)) {
        info.identifierName = node.properties.map(p => p.name && ts.isIdentifier(p.name) ? p.name.text : "").join()
        info.identifierValue = node.properties.map(p => ts.isPropertyAssignment(p) ? textEditor.document.getText(nodeToRange(p.initializer, code)) : "").join()
    }
    else if(ts.isPropertyAccessExpression(node)) {
        info.identifierName = ts.isIdentifier(node.expression) ? node.expression.text : textEditor.document.getText(nodeToRange(node.expression, code)).trim()
        info.identifierValue = node.name.text
    }
    else if(ts.isBinaryExpression(node)) {
        info.identifierValue = textEditor.document.getText(new vscode.Range(posToLine(code, node.left.pos), posToLine(code, node.right.end))).trim()
        info.leftOperand = ts.isIdentifier(node.left) ? node.left.text : textEditor.document.getText(new vscode.Range(posToLine(code, node.left.pos), posToLine(code, node.left.end))).trim()
        info.rightOperand = ts.isIdentifier(node.right) ? node.right.text : textEditor.document.getText(new vscode.Range(posToLine(code, node.right.pos), posToLine(code, node.right.end))).trim()
        info.operator = ts.SyntaxKind[node.operatorToken.kind]
    }
    else if(ts.isIdentifier(node)) {
        // console.log('identifier node', node)
        info.identifierName = node.text
        info.identifierValue = textEditor.document.getText(nodeToRange(node, code)).trim()
    }
    else if(ts.isParameter(node)) {
        // console.log('parameter node', node)
        info.identifierType = ts.SyntaxKind[node.name.kind]
        info.identifierName = ts.isIdentifier(node.name) ? node.name.text : textEditor.document.getText(nodeToRange(node.name, code)).trim()
        info.identifierValue = node.type && ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName) ? node.type.typeName.text : textEditor.document.getText(nodeToRange(node, code)).trim()
    }
    else if(ts.isExpressionStatement(node)) {
        // console.log('expression node', node)
        info.identifierValue = ts.isIdentifier(node.expression) ? node.expression.text : textEditor.document.getText(nodeToRange(node, code)).trim()
        info.identifierType = ts.SyntaxKind[node.expression.kind]
    }
    else if(ts.isArrayLiteralExpression(node)) {
        info.array = node.elements.map(e => handleNodeDataExtraction(e, textEditor, activeSelection, path, code, i))
    }

    return info
}

// function handleClassRootNode(node: ts.ClassDeclaration, code: string, activeSelection: vscode.Selection) : ts.Node[] {
//     let root: ts.NodeArray<ts.ClassElement> = node.members
//     let path: ts.NodeArray<ts.ClassElement | ts.ClassDeclaration> = node;
//     do {
//         let candidates = root.filter((c: ts.Node) => {
//             let range = nodeToRange(c, code)
//             return range.contains(activeSelection)
//         })
//         // let candidateNodes: any[] = []
//         // candidates.forEach((c: any) => candidateNodes.push(getNodes(c)))
//         // let flat = new ts.NodeArray<ts.ClassElement> ([].concat(...candidateNodes))
//         let flat = candidates.flatMap(c => getNodes(c))
//         path = path.concat(...flat)
//         root = flat
//     } while(root.length)
// }

export const handleDidChangeTextEditorSelection = async (
    e: vscode.TextEditorSelectionChangeEvent
) : Promise<void> => {
    const { selections, textEditor } = e
    const activeSelection = selections[0]
    const tsSource = tsFiles.find(f => f.localFileName === textEditor.document.fileName)
    if(tsSource) {
        const code = tsSource.tsSourceFile.text
        const nodes = getNodes(tsSource.tsSourceFile)
        console.log('nodes', nodes);
        const nodeData = nodes.map((n, i) => { 
            return { node: n, indices: [i], range: nodeToRange(n, code), children: getNodes(n) } 
        })
        const parent = nodeData.find(r => r.range.contains(activeSelection))
        console.log('parent', parent)
        console.log('interface dec', nodes.find(n => ts.isInterfaceDeclaration(n)))
        if(parent) {
            let root: ts.Node[] = parent.children;
            let path: ts.Node[] = [parent.node];
            do {
                let candidates = root.filter((c: ts.Node) => {
                    let range = nodeToRange(c, code)
                    return range.contains(activeSelection)
                })
                let candidateNodes: any[] = []
                candidates.forEach((c: any) => candidateNodes.push(getNodes(c)))
                let flat: ts.Node[] = [].concat(...candidateNodes)
                path = path.concat(...flat)
                root = flat
            } while(root.length)
            // console.log('path to selection', path)
            let nodeInfo: any[] = path.map((p, i) => handleNodeDataExtraction(p, textEditor, activeSelection, path, code, i))
            console.log('nodeInfo', nodeInfo)
            console.log('kinds', path.map(n => ts.SyntaxKind[n.kind]))
            console.log('direct parents?', nodeInfo.filter(n => n.isDirectParent))
            // const identifierNodes: ts.Node[] = path.filter((node: ts.Node) => { 
            //     return ts.isIdentifier(node)
            // })
            // console.log('identifier', identifierNodes);
        }

    }
    // if(activeSelection.start.isEqual(activeSelection.end)) {
    //     textEditor.setDecorations(floatingDecorations, []);
    //     return
    // }
    // const range = textEditor.document.lineAt(activeSelection.start).range;

    // const hover = await hoverController.provideAnnotationCreationHover(textEditor.document, activeSelection.end);
    // console.log('hover', hover);
    let createAnnotationWebviewLink: vscode.MarkdownString = new vscode.MarkdownString();
    createAnnotationWebviewLink.isTrusted = true;
    const create = vscode.Uri.parse(`command:adamite.addAnnotation`);
    createAnnotationWebviewLink.appendMarkdown(`[Create Annotation](${create})`);
    const decOpts: vscode.DecorationOptions[] = [{ range: selections[0], hoverMessage: createAnnotationWebviewLink }]
    textEditor.setDecorations(floatingDecorations, decOpts);
    return;
}