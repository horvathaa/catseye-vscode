/* 
searchHelpers.ts 

CONTAINS HELPER FUNCTIONS FOR CHOOSING NEXT BEST SEARCH SPACE 

Suggested Strategy: 
1. search in set of ACTIVE + VISIBLE files
2. expand to currently 'known' text editors 
3. search 'WORKED ON' files from git status not in 1.
ideally stop search here 
4. search in files of file's parent directory (least exact, might not get here)

*/
import * as vscode from 'vscode'
import { currentlyOpenDirPath, git, gitRootDir } from '../utils/utils'
var path = require('path')

/* 
PERFORMANCE NOTE: "The workspace offers support for listening to fs events 
and for finding files. Both perform well and run outside the editor-process so that
they should be always used instead of nodejs-equivalents." 
https://code.visualstudio.com/api/references/vscode-api#workspace 
*/
export const getFilesInDirectory = async (): Promise<string[]> => {
    let filesToSearch: string[] = []
    if (!vscode.workspace) return filesToSearch
    const currentlyOpenDirectory = path.dirname(currentlyOpenDirPath)
    const relativePattern = new vscode.RelativePattern(
        currentlyOpenDirectory,
        '**/*.{ts,tsx,js,jsx,css}'
    ) // https://code.visualstudio.com/api/references/vscode-api#GlobPattern
    const files = await vscode.workspace.findFiles(
        relativePattern,
        '{**/node_modules/**}',
        10 // max result
    )
    filesToSearch = files.map((uris: vscode.Uri) => {
        return uris.fsPath
    })
    // console.log('files in directory', filesToSearch)
    return filesToSearch
}

// textDocuments: "All text documents currently known to the editor"
export const getVisibileOpenFiles = (): string[] => {
    let filesToSearch: string[] = []
    if (vscode.workspace.workspaceFolders) {
        let knownDocuments: vscode.TextDocument[] = []
        knownDocuments = vscode.workspace.textDocuments.filter((doc) => {
            return (
                doc.languageId === 'typescript' ||
                doc.languageId === 'typescriptreact' ||
                doc.languageId === 'javascript' ||
                doc.languageId === 'javascriptreact' ||
                doc.languageId === 'css'
            )
        })
        knownDocuments.forEach((editor: vscode.TextDocument) => {
            const fsPath = editor.uri.fsPath
            filesToSearch.push(fsPath)
        })
    }
    // console.log('visibile open files', filesToSearch)
    return filesToSearch
}

// grabs modified, not_added (untracked), created (tracked), FOR LATER: conflicted
export const getWorkInProgressFiles = async () => {
    let filesToSearch: string[] = []
    const { modified, not_added, created } = await git.status()
    filesToSearch = filesToSearch.concat(modified, not_added, created) // ADD conflicted to test merge cases
    filesToSearch = filesToSearch.map((baseFile) => {
        return gitRootDir.concat('/', baseFile)
    })
    // console.log('status result', filesToSearch)
    return filesToSearch
}
