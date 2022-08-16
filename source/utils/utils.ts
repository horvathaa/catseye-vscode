/*
 *
 * utils.ts
 * Various functions to perform nitty-gritty tasks
 *
 */

import firebase from '../firebase/firebase'
import {
    Annotation,
    AnchorObject,
    Anchor,
    Snapshot,
    stringToShikiThemes,
    CommitObject,
    AnchorType,
} from '../constants/constants'
import {
    computeRangeFromOffset,
    computeVsCodeRangeFromOffset,
    createAnchorFromRange,
    getAnchorsWithGitUrl,
    getAnchorType,
    getSurroundingCodeArea,
    getSurroundingLinesAfterAnchor,
    getSurroundingLinesBeforeAnchor,
    validateAnchor,
} from '../anchorFunctions/anchor'
import {
    gitInfo,
    user,
    storedCopyText,
    annotationList,
    view,
    setAnnotationList,
    outOfDateAnnotations,
    deletedAnnotations,
    adamiteLog,
    setSelectedAnnotationsNavigations,
    currentColorTheme,
    activeEditor,
    setCurrentGitHubProject,
    setCurrentColorTheme,
    currentGitHubProject,
    setCurrentGitHubCommit,
    currentGitHubCommit,
    astHelper,
    trackedFiles,
    setTrackedFiles,
} from '../extension'
import * as vscode from 'vscode'
import { v4 as uuidv4 } from 'uuid'
import {
    getAnnotationsOnSignIn,
    saveCommit,
} from '../firebase/functions/functions'
import { saveAnnotations as fbSaveAnnotations } from '../firebase/functions/functions'
import { CodeContext } from '../astHelper/nodeHelper'
let { parse } = require('what-the-diff')
var shiki = require('shiki')
import { simpleGit, SimpleGit } from 'simple-git'

import { computeMostSimilarAnchor } from '../anchorFunctions/reanchor'

import {
    getFilesInDirectory,
    getVisibileOpenFiles,
    getWorkInProgressFiles,
} from '../anchorFunctions/searchHelpers'

// https://www.npmjs.com/package/simple-git
export const gitRootDir =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders[0].uri
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : ''
export const currentlyOpenDirPath = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.document.fileName
    : ''
export const git: SimpleGit = simpleGit(gitRootDir, { binary: 'git' })
let lastSavedAnnotations: Annotation[] =
    annotationList && annotationList.length ? annotationList : []

export const arrayUniqueByKey = (array: any, key: string): any[] => [
    ...new Map(
        array.map((item: { [key: string]: any }) => [item[key], item])
    ).values(),
]

// https://stackoverflow.com/questions/27030/comparing-arrays-of-objects-in-javascript
export const objectsEqual = (o1: any, o2: any): boolean =>
    typeof o1 === 'object' && Object.keys(o1).length > 0
        ? Object.keys(o1).length === Object.keys(o2).length &&
          Object.keys(o1).every((p) => objectsEqual(o1[p], o2[p]))
        : o1 === o2

const arraysEqual = (a1: any[], a2: any[]): boolean => {
    return (
        a1.length === a2.length &&
        a1.every((o, idx) => objectsEqual(o, a2[idx]))
    )
}

// on sign-in, get and sort user's annotations into memory
export const initializeAnnotations = async (
    user: firebase.User
): Promise<void> => {
    const currFilename: string | undefined =
        vscode.window.activeTextEditor?.document.uri.path.toString()
    const annotations: Annotation[] =
        //sortAnnotationsByLocation(
        await getAnnotationsOnSignIn(user, currentGitHubProject)
    //)
    setAnnotationList(annotations)
    const selectedAnnotations: Annotation[] = annotations.filter(
        (a) => a.selected
    )
    setSelectedAnnotationsNavigations(
        selectedAnnotations.length
            ? selectedAnnotations.map((a: Annotation) => {
                  return {
                      id: a.id,
                      anchorId: a.anchors[0].anchorId,
                      lastVisited: false,
                  }
              })
            : []
    )
}

export const removeNulls = (arr: any[]): any[] => {
    return arr.filter((a) => a !== null)
}

export function partition(array: any[], isValid: (a: any) => boolean) {
    return array.reduce(
        ([pass, fail], elem) => {
            return isValid(elem)
                ? [[...pass, elem], fail]
                : [pass, [...fail, elem]]
        },
        [[], []]
    )
}

export const getAnnotationsWithStableGitUrl = (
    annotationList: Annotation[],
    stableGitUrl: string
): Annotation[] => {
    return annotationList.filter((a) => {
        const annoUrls = getAllAnnotationStableGitUrls([a])
        return annoUrls.includes(stableGitUrl)
    })
}

export const getAnnotationsInFile = (
    annotationList: Annotation[],
    filename: string
): Annotation[] => {
    return annotationList.filter((a) => {
        const annoFiles = getAllAnnotationFilenames([a])
        return annoFiles.includes(filename)
    })
}

export const getAnnotationsNotInFile = (
    annotationList: Annotation[],
    filename: string
): Annotation[] => {
    return annotationList.filter((a) => {
        const annoFiles = getAllAnnotationFilenames([a])
        return !annoFiles.includes(filename)
    })
}

export const getAnnotationsNotWithGitUrl = (
    annotationList: Annotation[],
    gitUrl: string
): Annotation[] => {
    return annotationList.filter((a) => {
        const annoUrls = getAllAnnotationStableGitUrls([a])
        return !annoUrls.includes(gitUrl)
    })
}

export const getAllAnnotationFilenames = (
    annotationList: Annotation[]
): string[] => {
    const flatMapReturn = annotationList.flatMap((a) => {
        return a.anchors?.map((a) => a.filename)
    })
    return [...new Set(flatMapReturn)]
}

export const getAllAnnotationStableGitUrls = (
    annotationList: Annotation[]
): string[] => {
    return [
        ...new Set(
            annotationList.flatMap((a) => a.anchors?.map((a) => a.stableGitUrl))
        ),
    ]
}

export const getFirstLineOfHtml = (
    html: string,
    isOneLineAnchor: boolean
): string => {
    const index: number = html.indexOf('<span style')
    const closingIndex: number = html.indexOf('<span class="line">', index)
    return isOneLineAnchor
        ? html
        : html.substring(0, closingIndex) + '</code></pre>'
}

export const removeOutOfDateAnnotations = (
    annotationList: Annotation[]
): Annotation[] => {
    return annotationList.filter((a) => {
        if (a.deleted || a.outOfDate) {
            console.log('removing this anno', a)
        }
        return !(a.deleted || a.outOfDate)
    })
}

export function getListFromSnapshots(
    snapshots: firebase.firestore.QuerySnapshot
): any[] {
    let out: any = []
    snapshots.forEach((snapshot) => {
        out.push({
            id: snapshot.id,
            ...snapshot.data(),
        })
    })
    return out
}

// copy/cut anno --> additional metadata relative to previous range
export const reconstructAnnotations = (
    annotationOffsetList: { [key: string]: any }[],
    text: string,
    changeRange: vscode.Range,
    filePath: vscode.Uri,
    workspace: vscode.Uri,
    doc: vscode.TextDocument
): Annotation[] => {
    return annotationOffsetList.map((a: { [key: string]: any }) => {
        const visiblePath: string = vscode.workspace.workspaceFolders
            ? getVisiblePath(
                  a.anno.projectName,
                  vscode.window.activeTextEditor?.document.uri.fsPath
              )
            : vscode.window.activeTextEditor?.document.uri.fsPath
            ? vscode.window.activeTextEditor?.document.uri.fsPath
            : ''
        const projectName: string = getProjectName(filePath.toString())
        const newAnnoId: string = uuidv4()
        const newAnchorRange = computeVsCodeRangeFromOffset(
            changeRange,
            a.offsetInCopy
        )
        const anchorObject: AnchorObject = {
            anchor: computeRangeFromOffset(changeRange, a.offsetInCopy),
            anchorText: a.anchor.anchorText,
            html: a.anchor.html,
            filename: filePath.toString(),
            gitUrl: getGithubUrl(visiblePath, projectName, false), // a.anno.gitUrl,
            stableGitUrl: getGithubUrl(visiblePath, projectName, true),
            visiblePath,
            anchorPreview: a.anchor.anchorPreview,
            programmingLang: a.anchor.programmingLang,
            gitRepo: gitInfo[projectName]?.repo, // a.anno.gitRepo,
            gitBranch: gitInfo[projectName]?.branch,
            gitCommit: gitInfo[projectName]?.commit,
            anchorId: uuidv4(),
            originalCode: a.anchor.originalCode,
            parentId: newAnnoId,
            anchored: true,
            createdTimestamp: new Date().getTime(),
            priorVersions: a.anchor.priorVersions, //could append the most recent place, but commit based for now
            path: vscode.window.activeTextEditor
                ? astHelper.generateCodeContextPath(
                      changeRange,
                      vscode.window.activeTextEditor.document
                  )
                : [],
            surroundingCode: vscode.window.activeTextEditor
                ? getSurroundingCodeArea(
                      vscode.window.activeTextEditor.document,
                      newAnchorRange
                  )
                : { linesBefore: [], linesAfter: [] },
            potentialReanchorSpots: [],
            anchorType: vscode.window.activeTextEditor
                ? getAnchorType(
                      a.anchor,
                      vscode.window.activeTextEditor.document
                  )
                : AnchorType.partialLine,
        }
        const adjustedAnno = {
            id: newAnnoId,
            annotation: a.anno.annotation,
            anchors: [anchorObject],
            deleted: false,
            outOfDate: false,
            authorId: a.anno.authorId,
            createdTimestamp: new Date().getTime(),
            gitRepo: gitInfo[projectName]?.repo, // a.anno.gitRepo,
            gitBranch: gitInfo[projectName]?.branch,
            gitCommit: gitInfo[projectName]?.commit,
            projectName: projectName,
            githubUsername: gitInfo.author,
            replies: a.anno.replies,
            outputs: a.anno.outputs,
            codeSnapshots: a.anno.codeSnapshots,
            sharedWith: a.anno.sharedWith,
            selected: a.anno.selected,
            needToUpdate: true,
        }

        return buildAnnotation(adjustedAnno)
    })
}

export const didUserPaste = (changeText: string): boolean => {
    return changeText === storedCopyText
}

const checkIfAnnotationIncludesChange = (
    anno: Annotation,
    text: string
): boolean => {
    const cleanChangeText = text.replace(/\s+/g, '')
    if (cleanChangeText === '') return false
    const anchorTextArr: string[] = anno.anchors.map((a) =>
        a.anchorText.replace(/\s+/g, '')
    )
    return anchorTextArr.includes(cleanChangeText)
}

export const checkIfChangeIncludesAnchor = (
    annotationList: Annotation[],
    text: string
): Annotation[] => {
    return annotationList.filter((a: Annotation) =>
        checkIfAnnotationIncludesChange(a, text)
    )
}

const getShikiTheme = (pl: string): string => {
    let theme
    if (pl === 'css') {
        theme = stringToShikiThemes[pl]
    } else if (stringToShikiThemes[currentColorTheme]) {
        theme = stringToShikiThemes[currentColorTheme]
    } else {
        switch (vscode.window.activeColorTheme.kind) {
            case 1: // LIGHT
                theme = 'light-plus'
                break
            case 2: // DARK
                theme = 'dark-plus'
                break
            case 3: // HIGH CONTRAST
                theme = 'hc_light'
                break
            default:
                theme = 'dark-plus'
                break
        }
    }
    return theme
}

// We use Shiki to style the user's code to look like VS Code
// This function prepares the string, gets the appropriate color theme for Shiki, and styles the code
export const getShikiCodeHighlighting = async (
    filename: string,
    anchorText: string
): Promise<string> => {
    const regexMatch: RegExpMatchArray | null = filename.match(/\.[0-9a-z]+$/i)
    const pl: string = regexMatch ? regexMatch[0].replace('.', '') : 'js'
    const highlighter: any = await shiki.getHighlighter({
        theme: getShikiTheme(pl),
    })
    try {
        const html: string = highlighter.codeToHtml(anchorText, pl)
        const insertionPoint = html.indexOf('style')
        const insert = ';margin-bottom: 0;margin-top: 0.5em;'
        const modifiedHtml =
            html.slice(
                0,
                insertionPoint + 'style="background-color: #1E1E1E'.length
            ) +
            insert +
            html.slice(
                insertionPoint + 'style="background-color: #1E1E1E'.length
            )
        return modifiedHtml ? modifiedHtml : anchorText
    } catch (error) {
        console.error('shiki failed', error)
        return anchorText
    }
}

// We need to update the Shiki-generated HTML when the user makes an edit to annotated code
const updateAnchorHtml = async (
    anno: Annotation,
    doc: vscode.TextDocument
): Promise<Annotation> => {
    const updatedAnchors: AnchorObject[] = await Promise.all(
        anno.anchors.map(async (a: AnchorObject) => {
            if (a.filename === doc.uri.toString()) {
                const newVscodeRange: vscode.Range = new vscode.Range(
                    new vscode.Position(
                        a.anchor.startLine,
                        a.anchor.startOffset
                    ),
                    new vscode.Position(a.anchor.endLine, a.anchor.endOffset)
                )
                const newAnchorText: string = doc.getText(newVscodeRange)
                const newHtml: string = await getShikiCodeHighlighting(
                    a.filename.toString(),
                    newAnchorText
                )
                const firstLine: string = getFirstLineOfHtml(
                    newHtml,
                    !newAnchorText.includes('\n')
                )
                return {
                    ...a,
                    html: newHtml,
                    anchorText: newAnchorText,
                    anchorPreview: firstLine,
                }
            } else {
                return a
            }
        })
    )
    return buildAnnotation({
        ...anno,
        anchors: updatedAnchors,
        needToUpdate: true,
    })
}

const updateHtml = async (
    annos: Annotation[],
    doc: vscode.TextDocument
): Promise<Annotation[]> => {
    let updatedList: Annotation[] = []
    for (let x = 0; x < annos.length; x++) {
        const newAnno = await updateAnchorHtml(annos[x], doc)
        updatedList.push(newAnno)
    }

    return updatedList
}

export const getAllAnnotationsWithGitUrlInFile = (
    annotationList: Annotation[],
    currentUrl: string
): Annotation[] => {
    return annotationList.filter((a: Annotation) => {
        const urls: string[] = a.anchors.map((a) => a.stableGitUrl)
        return urls.includes(currentUrl)
    })
}

export const getAllAnnotationsWithAnchorInFile = (
    annotationList: Annotation[],
    currentFile: string
): Annotation[] => {
    return annotationList.filter((a: Annotation) => {
        const filesThisAnnotationIsIn: string[] = a.anchors.map(
            (a) => a.filename
        )
        return filesThisAnnotationIsIn.includes(currentFile)
    })
}

// Called by event handler when user saves or closes a file - saves annotations that have been changed to FireStore
export const handleSaveCloseEvent = async (
    annotationList: Annotation[],
    filePath: string = '',
    currentFile: string = 'all',
    doc: vscode.TextDocument | undefined = undefined
): Promise<void> => {
    const annosToSave: Annotation[] = annotationList.concat(
        outOfDateAnnotations,
        deletedAnnotations
    )
    // console.log('annosToSave?', annosToSave)
    const annotationsInCurrentFile =
        currentFile !== 'all'
            ? getAllAnnotationsWithGitUrlInFile(annotationList, currentFile)
            : annotationList
    if (doc && vscode.workspace.workspaceFolders) {
        let newList = await updateHtml(annotationsInCurrentFile, doc)

        const ids: string[] = newList.map((a) => a.id)
        const visibleAnnotations: Annotation[] =
            currentFile === 'all'
                ? newList
                : annotationList
                      .filter((a) => !ids.includes(a.id))
                      .concat(newList)
        setAnnotationList(visibleAnnotations)
        view?.updateDisplay(visibleAnnotations)
        if (annosToSave.some((a: Annotation) => a.needToUpdate)) {
            lastSavedAnnotations = annosToSave
            saveAnnotations(
                annosToSave.filter((a) => a.needToUpdate),
                filePath
            )
            const updatedList: Annotation[] = annosToSave.map((a) => {
                return buildAnnotation({ ...a, needToUpdate: false })
            })
            setAnnotationList(removeOutOfDateAnnotations(updatedList))
        }
    } else if (
        annotationsInCurrentFile.length &&
        vscode.workspace.workspaceFolders &&
        !arraysEqual(annosToSave, lastSavedAnnotations)
    ) {
        // console.log('is this ever called???')
        lastSavedAnnotations = annosToSave
        saveAnnotations(
            annosToSave.filter((a) => a.needToUpdate),
            filePath
        )
    }
    // testing purposes
    getFilesInDirectory()
    getVisibileOpenFiles()
    getWorkInProgressFiles()
}

const translateSnapshotStandard = (snapshots: any[]): Snapshot[] => {
    return snapshots.map((s: any) => {
        return {
            createdTimestamp: s.createdTimestamp,
            snapshot: s.snapshot,
            anchorId: '',
            anchorText: '',
            diff: '',
            githubUsername: '',
            id: uuidv4(),
            comment: '',
            deleted: false,
        }
    })
}

// convers annotation class items into regular JavaScript objects for saving to FireStore
export const makeObjectListFromAnnotations = (
    annotationList: Annotation[]
): { [key: string]: any }[] => {
    return annotationList.map((a) => {
        return {
            id: a.id ? a.id : uuidv4(),
            annotation: a.annotation ? a.annotation : '',
            anchors: a.anchors ? a.anchors : [], // ok to send on save/close bc CommitObject handles changes
            authorId: a.authorId ? a.authorId : '',
            createdTimestamp: a.createdTimestamp
                ? a.createdTimestamp
                : new Date().getTime(),
            deleted: a.deleted !== undefined ? a.deleted : true,
            outOfDate: a.outOfDate !== undefined ? a.outOfDate : false,
            gitRepo: a.gitRepo ? a.gitRepo : '',
            gitBranch: a.gitBranch ? a.gitBranch : '',
            gitCommit: a.gitCommit ? a.gitCommit : '',
            projectName: a.projectName ? a.projectName : '',
            githubUsername: a.githubUsername ? a.githubUsername : '',
            replies: a.replies ? a.replies : [],
            resolved: a.resolved ? a.resolved : false,
            outputs: a.outputs ? a.outputs : [],
            codeSnapshots: a.codeSnapshots
                ? a.codeSnapshots.length > 0 &&
                  a.codeSnapshots[0].hasOwnProperty('diff')
                    ? a.codeSnapshots
                    : translateSnapshotStandard(a.codeSnapshots)
                : [],
            sharedWith: a.sharedWith ? a.sharedWith : 'private',
            selected: a.selected ? a.selected : false,
            types: a.types ? a.types : [],
        }
    })
}

// Save annotations to FireStore and (optionally) save to JSON
export const saveAnnotations = async (
    annotationList: Annotation[],
    filePath: string,
    requestedFromUi?: boolean
): Promise<void> => {
    if (user) {
        fbSaveAnnotations(annotationList)
    }
    if (requestedFromUi || !user) {
        writeToFile(
            makeObjectListFromAnnotations(annotationList),
            annotationList,
            filePath
        )
    }
}

const writeToFile = async (
    serializedObjects: { [key: string]: any }[],
    annotationList: Annotation[],
    filePath: string
): Promise<void> => {
    const uri = vscode.Uri.file(filePath)
    try {
        await vscode.workspace.fs.stat(uri)
        vscode.workspace.openTextDocument(filePath).then((doc) => {
            vscode.workspace.fs
                .writeFile(
                    doc.uri,
                    new TextEncoder().encode(JSON.stringify(serializedObjects))
                )
                .then(() => {
                    annotationList.forEach((a) => (a.deleted = false))
                })
        })
    } catch {
        const wsEdit = new vscode.WorkspaceEdit()
        wsEdit.createFile(uri)
        vscode.workspace.applyEdit(wsEdit).then((value: boolean) => {
            if (value) {
                // edit applied??
                vscode.workspace.openTextDocument(filePath).then((doc) => {
                    vscode.workspace.fs
                        .writeFile(
                            doc.uri,
                            new TextEncoder().encode(
                                JSON.stringify(serializedObjects)
                            )
                        )
                        .then(() => {
                            annotationList.forEach((a) => (a.deleted = false))
                        })
                })
            } else {
                vscode.window.showInformationMessage('Could not create file!')
            }
        })
    }
}

export const getStableGitHubUrl = (fsPath: string): string => {
    const projectName = getProjectName(fsPath)
    const visPath = getVisiblePath(projectName, fsPath)
    return getGithubUrl(visPath, projectName, true)
}

const getEndUrl = (visiblePath: string, projectName: string): string => {
    let endUrl: string = ''
    const firstIndex: number = visiblePath.indexOf(projectName) // this should be 0
    // projectname appears multiple times in the string
    if (
        firstIndex !== -1 &&
        firstIndex !== visiblePath.lastIndexOf(projectName)
    ) {
        // may just be able to do this everytime instead of the else
        endUrl = visiblePath.includes('\\')
            ? visiblePath
                  .substring(firstIndex + projectName.length)
                  .replace(/\\/g, '/')
            : visiblePath.substring(firstIndex + projectName.length)
    } else {
        endUrl = visiblePath.includes('\\')
            ? visiblePath.split(projectName)[1]?.replace(/\\/g, '/')
            : visiblePath.split(projectName)[1] // '\\' : '\/';
    }
    return endUrl
}

export const getGithubUrl = (
    visiblePath: string | undefined,
    projectName: string,
    returnStable: boolean
): string => {
    const visPath = !visiblePath
        ? getVisiblePath(projectName, activeEditor?.document.uri.fsPath)
        : visiblePath
    if (!gitInfo[projectName]?.repo || gitInfo[projectName]?.repo === '')
        return ''
    const baseUrl: string = gitInfo[projectName].repo.split('.git')[0]
    const endUrl = getEndUrl(visPath, projectName)
    return gitInfo[projectName].commit === 'localChange' || returnStable
        ? baseUrl + '/tree/' + gitInfo[projectName].nameOfPrimaryBranch + endUrl
        : baseUrl + '/tree/' + gitInfo[projectName].commit + endUrl
}

export const getVisiblePath = (
    projectName: string,
    workspacePath: string | undefined
): string => {
    if (projectName && workspacePath) {
        const path: string = workspacePath.substring(
            workspacePath.indexOf(projectName)
        )
        if (path) return path
    } else if (workspacePath) {
        return workspacePath
    }
    return projectName
}

const getAllAnchors = (annotationList: Annotation[]): AnchorObject[] => {
    return annotationList.flatMap((a) => a.anchors)
}

const getAllAnchorsOnCommit = (
    annotationList: Annotation[],
    commit: string
): AnchorObject[] => {
    return getAllAnchors(annotationList).filter((a) => a.gitCommit === commit)
}

export const updateAnnotationCommit = (
    lastCommit: string, // "Current commit"
    lastBranch: string,
    commit: string,
    branch: string,
    repo: string
): void => {
    // update any anchor points that've changed since last commit
    const anchorsOnCommit: AnchorObject[] = getAllAnchorsOnCommit(
        annotationList,
        lastCommit
    )
    const ids = anchorsOnCommit.map((a) => a.parentId)
    const annosOnCommit = annotationList.filter((a) => ids.includes(a.id)) // grabs annotations whose anchor points have changed - do we also update when annotation content changes?

    // SAVE CURRENT STATE W/ COMMITOBJECT
    const commitObject: CommitObject = {
        commit: lastCommit,
        gitRepo: repo,
        branchName: lastBranch,
        anchorsOnCommit: anchorsOnCommit.map((a) => {
            const { priorVersions, ...x } = a
            return x
        }),
        createdTimestamp: new Date().getTime(),
    }
    saveCommit(commitObject)
    fbSaveAnnotations(annosOnCommit) // smarter - only send edited annotations, get all annotations on commit
    setAnnotationList([
        ...annotationList.filter((a) => !ids.includes(a.id)),
        ...annosOnCommit,
    ])
}

const findMostLikelyRepository = (gitApi: any): string => {
    const repositoryUrls = gitApi.repositories.map(
        (r: any) => r?.state?.remotes[0]?.fetchUrl
    )
    if (!repositoryUrls || repositoryUrls.includes(undefined)) {
        return ''
    }
    const currentProjectName = getProjectName(
        vscode.window.activeTextEditor?.document.fileName
    )

    return vscode.workspace.name &&
        !vscode.workspace.name.includes('(Workspace)')
        ? repositoryUrls.find(
              (r: string) =>
                  vscode.workspace.name && r.includes(vscode.workspace.name)
          )
        : repositoryUrls.find((r: string) => {
              const splitUrl = r.split('/')
              const end = splitUrl[splitUrl.length - 1]
              const name = end.split('.git')[0]
              return currentProjectName === name
          })
}

export const updateCurrentGitHubCommit = (gitApi: any): void => {
    if (gitApi.repositories && gitApi.repositories.length === 1) {
        setCurrentGitHubCommit(gitApi.repositories[0].state.HEAD.commit)
    } else if (vscode.window.activeTextEditor && gitInfo[getProjectName()]) {
        setCurrentGitHubCommit(gitInfo[getProjectName()].commit)
    } else {
        const match = findMostLikelyRepository(gitApi)
        const matchCommit = gitApi.repositories.find(
            (r: any) => r?.state?.remotes[0]?.fetchUrl === match
        )?.state.HEAD.commit
        setCurrentGitHubCommit(matchCommit)
    }
}

// TODO: is there a type def for the gitApi?? Or VS Code APIs in general?
export const updateCurrentGitHubProject = (gitApi: any): void => {
    // probably most common case
    if (gitApi.repositories && gitApi.repositories.length === 1) {
        setCurrentGitHubProject(
            gitApi.repositories[0].state.remotes[0].fetchUrl
        )
    } else if (vscode.window.activeTextEditor && gitInfo[getProjectName()]) {
        setCurrentGitHubProject(gitInfo[getProjectName()].repo)
    } else {
        const match = findMostLikelyRepository(gitApi)
        match ? setCurrentGitHubProject(match) : setCurrentGitHubProject('')
    }
}

// on launch, using Git API, get metadata about each annotation, the commit it corresponds to, and more
export const generateGitMetaData = async (
    gitApi: any
): Promise<{ [key: string]: any }> => {
    await gitApi.repositories?.forEach(async (r: any) => {
        const currentProjectName: string = getProjectName(r?.rootUri?.path)
        r?.state?.onDidChange(async () => {
            // const currentProjectName: string = getProjectName(r?.rootUri?.path)
            if (!gitInfo[currentProjectName] && r) {
                gitInfo[currentProjectName] = {
                    repo: r?.state?.remotes[0]?.fetchUrl
                        ? r?.state?.remotes[0]?.fetchUrl
                        : r?.state?.remotes[0]?.pushUrl
                        ? r?.state?.remotes[0]?.pushUrl
                        : '',
                    branch: r?.state?.HEAD?.name ? r?.state?.HEAD?.name : '',
                    commit: r?.state?.HEAD?.commit
                        ? r?.state?.HEAD?.commit
                        : '',
                    modifiedAnnotations: [],
                }
            }

            if (
                //heuristic for changing commit hash
                gitInfo.hasOwnProperty(currentProjectName) &&
                (gitInfo[currentProjectName]?.commit !== r.state.HEAD.commit ||
                    gitInfo[currentProjectName]?.branch !== r.state.HEAD.name)
            ) {
                // save user's current commit (current) before updating to next - this is how we query for 'current commit'
                updateAnnotationCommit(
                    gitInfo[currentProjectName].commit,
                    gitInfo[currentProjectName].branch,
                    r.state.HEAD.commit,
                    r.state.HEAD.name,
                    r?.state?.remotes[0]?.fetchUrl
                )
                gitInfo[currentProjectName].commit = r.state.HEAD.commit
                gitInfo[currentProjectName].branch = r.state.HEAD.name
            }
        })
        const branchNames = r.state.refs.map(
            (ref: { [key: string]: any }) => ref.name
        )
        const nameOfPrimaryBranch = branchNames.includes('main')
            ? 'main'
            : branchNames.includes('master')
            ? 'master'
            : '' // are there other common primary branch names? or another way of determining what this is lol
        gitInfo[currentProjectName] = {
            repo: r?.state?.remotes[0]?.fetchUrl
                ? r?.state?.remotes[0]?.fetchUrl
                : r?.state?.remotes[0]?.pushUrl
                ? r?.state?.remotes[0]?.pushUrl
                : '',
            branch: r?.state?.HEAD?.name ? r?.state?.HEAD?.name : '',
            commit: r?.state?.HEAD?.commit ? r?.state?.HEAD?.commit : '',
            modifiedAnnotations: [],
            nameOfPrimaryBranch,
        }
    })

    updateCurrentGitHubProject(gitApi)
    updateCurrentGitHubCommit(gitApi)

    return gitInfo
}

export const getProjectName = (filename?: string | undefined): string => {
    if (vscode.workspace.workspaceFolders) {
        if (vscode.workspace.workspaceFolders.length > 1 && filename) {
            const slash: string = filename.includes('\\') ? '\\' : '/'
            const candidateProjects: string[] =
                vscode.workspace.workspaceFolders.map(
                    (f: vscode.WorkspaceFolder) => f.name
                )
            return candidateProjects.filter((name: string) =>
                filename.includes(name)
            )[0]
                ? candidateProjects.filter((name: string) =>
                      filename.includes(name)
                  )[0]
                : filename.split(slash)[filename.split(slash).length - 1]
                ? filename.split(slash)[filename.split(slash).length - 1]
                : filename
        } else if (vscode.workspace.workspaceFolders.length === 1) {
            return vscode.workspace.workspaceFolders[0].name
        } else if (!filename) {
            const fsPath: string = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.document.uri.fsPath
                : vscode.window.visibleTextEditors[0].document.uri.fsPath
            const candidateProjects: string[] =
                vscode.workspace.workspaceFolders.map(
                    (f: vscode.WorkspaceFolder) => f.name
                )
            const match = candidateProjects.find((project) =>
                fsPath.includes(project)
            )
            return match ? match : ''
        }
    }
    return ''
}

const translateAnnotationAnchorStandard = (
    annoInfo: any
): { [key: string]: any } => {
    return {
        id: annoInfo.id,
        annotation: annoInfo.annotation,
        anchors: [
            {
                anchor: {
                    startLine: annoInfo.anchor
                        ? annoInfo.anchor.startLine
                        : annoInfo.startLine,
                    startOffset: annoInfo.anchor
                        ? annoInfo.anchor.startOffset
                        : annoInfo.startOffset,
                    endLine: annoInfo.anchor
                        ? annoInfo.anchor.endLine
                        : annoInfo.endLine,
                    endOffset: annoInfo.anchor
                        ? annoInfo.anchor.endOffset
                        : annoInfo.endOffset,
                },
                anchorText: annoInfo.anchorText,
                html: annoInfo.html,
                filename: annoInfo.filename,
                gitUrl: annoInfo.gitUrl,
                stableGitUrl: annoInfo.stableGitUrl,
                visiblePath: annoInfo.visiblePath,
                anchorPreview: annoInfo.anchorPreview,
                programmingLang: annoInfo.programmingLang,
                anchorId: uuidv4(),
                originalCode: annoInfo.originalCode,
                parentId: annoInfo.id,
            },
        ],
        deleted: annoInfo.deleted,
        outOfDate: annoInfo.outOfDate,
        authorId: annoInfo.authorId,
        createdTimestamp: annoInfo.createdTimestamp,
        gitRepo: annoInfo.gitRepo,
        gitBranch: annoInfo.gitBranch,
        gitCommit: annoInfo.gitCommit,
        projectName: annoInfo.projectName,
        githubUsername: annoInfo.githubUsername,
        replies: annoInfo.replies,
        outputs: annoInfo.outputs,
        codeSnapshots: annoInfo.codeSnapshots,
        sharedWith: annoInfo.sharedWith,
        selected: annoInfo.selected,
        needToUpdate: annoInfo.needToUpdate ? annoInfo.needToUpdate : false,
        types: [],
    }
}

// Helper function for making annotation class objects from other standards
export const buildAnnotation = (
    annoInfo: any,
    range: vscode.Range | undefined = undefined
): Annotation => {
    let annoObj = null
    if (
        annoInfo.hasOwnProperty('anchor') ||
        annoInfo.hasOwnProperty('anchorText')
    ) {
        annoObj = translateAnnotationAnchorStandard(annoInfo)
    } else {
        annoObj = annoInfo
    }

    return new Annotation(
        annoObj['id'],
        annoObj['annotation'],
        annoObj['anchors'],
        annoObj['deleted'],
        annoObj['outOfDate'],
        annoObj['authorId'],
        annoObj['createdTimestamp'],
        annoObj['gitRepo'],
        annoObj['gitBranch'],
        annoObj['gitCommit'],
        annoObj['projectName'],
        annoObj['githubUsername'],
        annoObj['replies'],
        annoObj['outputs'],
        annoObj['codeSnapshots'],
        annoObj['sharedWith'],
        annoObj['selected'],
        annoObj['needToUpdate'],
        annoObj['types'],
        annoObj['resolved']
    )
}

// helper function for creating anchor objects from other standards
export const createAnchorObject = async (
    annoId: string,
    range: vscode.Range
): Promise<AnchorObject | undefined> => {
    const textEditor: vscode.TextEditor = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor
        : vscode.window.visibleTextEditors[0]
    if (textEditor) {
        const filename: string = textEditor.document.uri.toString()
        const anchorText: string = textEditor.document.getText(range)
        const html: string = await getShikiCodeHighlighting(
            filename,
            anchorText
        )
        const firstLineOfHtml: string = getFirstLineOfHtml(
            html,
            !anchorText.includes('\n')
        )
        const projectName: string = getProjectName(filename)
        const visiblePath: string = getVisiblePath(
            projectName,
            textEditor.document.uri.fsPath
        )
        const gitUrl: string = getGithubUrl(visiblePath, projectName, false)
        const stableGitUrl: string = getGithubUrl(
            visiblePath,
            projectName,
            true
        )
        const programmingLang: string = textEditor.document.uri
            .toString()
            .split('.')[
            textEditor.document.uri.toString().split('.').length - 1
        ]
        const anchorId = uuidv4()
        const createdTimestamp = new Date().getTime()
        const anc = createAnchorFromRange(range)
        const path: CodeContext[] = astHelper.generateCodeContextPath(
            range,
            textEditor.document
        )
        const surrounding = {
            linesBefore: getSurroundingLinesBeforeAnchor(
                textEditor.document,
                range
            ),
            linesAfter: getSurroundingLinesAfterAnchor(
                textEditor.document,
                range
            ),
        }
        const newAnchor = createAnchorFromRange(range)
        const anchorType = getAnchorType(newAnchor, textEditor.document)
        return {
            parentId: annoId,
            anchorId: anchorId,
            anchorText,
            html,
            anchorPreview: firstLineOfHtml,
            originalCode: html,
            gitUrl,
            stableGitUrl,
            gitRepo: gitInfo[projectName]?.repo
                ? gitInfo[projectName]?.repo
                : '',
            gitBranch: gitInfo[projectName]?.branch
                ? gitInfo[projectName]?.branch
                : '',
            gitCommit: gitInfo[projectName]?.commit
                ? gitInfo[projectName]?.commit
                : 'localChange',
            anchor: newAnchor,
            programmingLang,
            filename,
            visiblePath,
            anchored: true,
            createdTimestamp: createdTimestamp,
            priorVersions: [
                {
                    id: anchorId,
                    createdTimestamp: createdTimestamp,
                    html: html,
                    anchorText: anchorText,
                    commitHash: gitInfo[projectName]?.commit
                        ? gitInfo[projectName]?.commit
                        : 'localChange',
                    branchName: gitInfo[projectName]?.branch
                        ? gitInfo[projectName]?.branch
                        : '',
                    startLine: anc.startLine,
                    endLine: anc.endLine,
                    path: visiblePath,
                    surroundingCode: surrounding,
                    anchorType,
                },
            ],
            path,
            potentialReanchorSpots: [],
            surroundingCode: surrounding,
            anchorType,
        }
    } else {
        vscode.window.showInformationMessage('Must have open text editor!')
    }
}

export const getLastGitCommitHash = async () => {
    const options = ["--pretty=format:'%H'", '--skip=1', '--max-count=1']
    const result = await git.log(options)
    const lastCommit = result.all[0].hash.slice(1, -1)
    return lastCommit
}

export const partitionAnnotationsOnSignIn = (array: any[], filter: any) => {
    let lastCommit: any = [],
        otherCommit: any = []
    array.forEach((a, idx, arr) => {
        return (filter(a, idx, arr) ? lastCommit : otherCommit).push(a)
    })
    return [lastCommit, otherCommit]
}

export const levenshteinDistance = (s: string, t: string) => {
    if (!s.length) return t.length
    if (!t.length) return s.length
    const arr = []
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i]
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] =
                i === 0
                    ? j
                    : Math.min(
                          arr[i - 1][j] + 1,
                          arr[i][j - 1] + 1,
                          arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
                      )
        }
    }
    return arr[t.length][s.length]
}

export const updateAnnotationsWithAnchors = (
    anchors: AnchorObject[],
    annosWithAnchors?: Annotation[]
): Annotation[] => {
    const annoIds = anchors.map((a) => a.parentId)
    const matchingAnnos = annosWithAnchors
        ? annosWithAnchors.filter((a) => annoIds.includes(a.id))
        : annotationList.filter((a) => annoIds.includes(a.id))
    const updatedAnnos = matchingAnnos.map((a: Annotation) => {
        const annoAnchors = anchors.filter((anch) => anch.parentId === a.id)
        return buildAnnotation({
            ...a,
            anchors: annoAnchors,
            needToUpdate: true,
        })
    })
    return updatedAnnos
}

// returns currently opened files for reanchor search

/* 
WORKSPACE RECOMMENDATION: "The workspace offers support for listening to fs events 
and for finding files. Both perform well and run outside the editor-process so that
they should be always used instead of nodejs-equivalents."

VSCODE GLOBS TOO LIMITED!

start search space in set of current open files
run alg 
if don't find a candidate, search all modified files from git status 

*/
export const findOpenFilesToSearch = async () => {
    const folders = vscode.workspace.workspaceFolders
    // console.log('folders', folders)
    let filesToSearch: any[] = []
    if (!folders) return
    folders?.forEach(async (folder) => {
        // let relativePattern = new vscode.RelativePattern(folder, '**/*.ts')
        const files = await vscode.workspace.findFiles(
            '**/*.ts',
            '**/node_modules/**',
            10
        )
        // console.log('foundsomething', files)
        // const toString = (uris: vscode.Uri[]) => uris.map((uri) => uri.fsPath)
        filesToSearch = files.map((uris: vscode.Uri) => {
            return uris.fsPath
        })
        // console.log('files', filesToSearch)
    })

    // if (vscode.workspace.workspaceFolders) {
    //     vscode.window.visibleTextEditors.forEach(
    //         (editor: vscode.TextEditor) => {
    //             const path = editor.document.uri.path
    //             const fsPath = editor.document.uri.fsPath
    //             console.log('path', path, 'fspath', fsPath)
    //         }
    //     )
    // }

    if (vscode.workspace.workspaceFolders) {
        vscode.workspace.textDocuments.forEach(
            (editor: vscode.TextDocument) => {
                const path = editor.uri.path
                const fsPath = editor.uri.fsPath
                // console.log('path', path, 'fspath', fsPath)
            }
        )
    }
}

export const shouldTrackFile = (document: vscode.TextDocument): boolean => {
    const trackedUris = trackedFiles.map((f) => f.uri.fsPath)
    return !trackedUris.includes(document.uri.fsPath)
}

export const getAnnotationsInTextDocument = (
    document: vscode.TextDocument,
    annotations?: Annotation[]
): Annotation[] => {
    const gitUrl = getStableGitHubUrl(document.uri.fsPath)
    return getAnnotationsWithStableGitUrl(
        annotations ? annotations : annotationList,
        gitUrl
    )
}

export const getAnchorsInTextDocument = (
    document: vscode.TextDocument
): AnchorObject[] => {
    const gitUrl = getStableGitHubUrl(document.uri.fsPath)
    return getAnchorsWithGitUrl(gitUrl)
}

export const addFileToTrack = (document: vscode.TextDocument): void => {
    if (!checkIfFileIsTracked(document)) {
        setTrackedFiles([...trackedFiles, document])
        handleAuditNewFile(document)
    }
}

export const checkIfFileIsTracked = (
    document: vscode.TextDocument
): boolean => {
    return trackedFiles.map((a) => a.uri.fsPath).includes(document.uri.fsPath)
}

export const handleAuditNewFile = (document: vscode.TextDocument): void => {
    const anchors = getAnchorsInTextDocument(document)
    const annos = getAnnotationsInTextDocument(document)
    let updatedAnnoIds: string[] = []
    if (
        anchors.length &&
        annos.length &&
        !anchors.every((a: AnchorObject) => validateAnchor(a, document))
    ) {
        const updatedAnchors: AnchorObject[] = anchors
            .filter((a: AnchorObject) => !validateAnchor(a, document))
            .map((a: AnchorObject): AnchorObject => {
                return {
                    ...computeMostSimilarAnchor(document, a),
                    anchored: false,
                }
            })
        const updatedAnnos = updateAnnotationsWithAnchors(updatedAnchors, annos)
        updatedAnnoIds = updatedAnnoIds.concat([
            ...new Set(updatedAnnos.map((a) => a.id)),
        ])
        setAnnotationList(
            annotationList
                .filter((a) => !updatedAnnoIds.includes(a.id))
                .concat(updatedAnnos)
        )
        if (view) {
            view.updateDisplay(annotationList)
        }
    }
}
