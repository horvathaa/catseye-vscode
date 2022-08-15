import * as vscode from 'vscode'
import { getAnchorsWithGitUrl } from '../anchorFunctions/anchor'
import { AnchorObject } from '../constants/constants'
import { getStableGitHubUrl } from '../utils/utils'

const createFoldingRangeFromAnchor = (
    anchor: AnchorObject
): vscode.FoldingRange => {
    return new vscode.FoldingRange(
        anchor.anchor.startLine,
        anchor.anchor.endLine
    )
}

const catseyeProvideFoldingRanges = (
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
): vscode.ProviderResult<vscode.FoldingRange[]> => {
    const gitUrl = getStableGitHubUrl(document.uri.fsPath)
    const anchorsInFile = getAnchorsWithGitUrl(gitUrl)
    return anchorsInFile.map((a) => createFoldingRangeFromAnchor(a))
}

const onDidChangeFoldingRangesEvent = new vscode.EventEmitter<void>()

export const refreshFoldingRanges = () => {
    onDidChangeFoldingRangesEvent.fire()
}

export const catseyeFoldingRangeProvider: vscode.FoldingRangeProvider = {
    provideFoldingRanges: catseyeProvideFoldingRanges,
    onDidChangeFoldingRanges: onDidChangeFoldingRangesEvent.event,
}
