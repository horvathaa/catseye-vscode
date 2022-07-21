import ts = require('typescript')
import { CodeContext } from '../astHelper/nodeHelper'

// import * as vscode from 'vscode';
export class Annotation {
    id: string
    annotation: string
    anchors: AnchorObject[] // only updating on commit, initialized upon Annotation creation
    deleted: boolean
    outOfDate: boolean
    authorId: string
    createdTimestamp: number
    gitRepo: string
    gitBranch: string
    gitCommit: string
    projectName: string
    githubUsername: string
    replies: Reply[]
    outputs: { [key: string]: any }[]
    codeSnapshots: Snapshot[]
    sharedWith: string
    selected: boolean
    needToUpdate: boolean
    types: Type[]
    resolved: boolean

    constructor(
        id: string,
        annotation: string,
        anchors: AnchorObject[],
        deleted: boolean,
        outOfDate: boolean,
        authorId: string,
        createdTimestamp: number,
        gitRepo: string,
        gitBranch: string,
        gitCommit: string,
        projectName: string,
        githubUsername: string,
        replies: Reply[],
        outputs: { [key: string]: any }[],
        codeSnapshots: Snapshot[],
        sharedWith: string,
        selected: boolean,
        needToUpdate: boolean,
        types?: Type[],
        resolved?: boolean
    ) {
        this.id = id
        this.annotation = annotation
        this.anchors = anchors
        this.deleted = deleted
        this.outOfDate = outOfDate
        this.authorId = authorId
        this.createdTimestamp = createdTimestamp
        this.gitRepo = gitRepo
        this.gitBranch = gitBranch
        this.gitCommit = gitCommit
        this.projectName = projectName
        this.githubUsername = githubUsername
        this.replies = replies
        this.outputs = outputs
        this.codeSnapshots = codeSnapshots
        this.sharedWith = sharedWith
        this.selected = selected
        this.needToUpdate = needToUpdate
        this.types = types ?? []
        this.resolved = resolved ?? false
    }
}

export interface Anchor {
    startLine: number
    endLine: number
    startOffset: number
    endOffset: number
}

export const NUM_SURROUNDING_LINES = 5

export interface SurroundingAnchorArea {
    linesBefore: string[] // len should equal NUM_SURROUNDING_LINES
    linesAfter: string[]
}

export interface AnchorObject {
    anchor: Anchor
    anchorText: string
    html: string
    filename: string
    gitUrl: string //current commit url
    stableGitUrl: string //tree/main
    visiblePath: string
    gitRepo: string
    gitBranch: string
    gitCommit: string
    anchorPreview: string
    programmingLang: string
    anchorId: string
    originalCode: string
    parentId: string
    anchored: boolean
    createdTimestamp: number
    priorVersions?: AnchorOnCommit[] // Not in FB until commit. Rn, dynamically compute priorVersionsfrom the Commit object model on launch
    path: CodeContext[]
    surroundingCode: SurroundingAnchorArea
    //add annotation field, ridding of multiple anchors
}

// create: using re-anchor algorithm (tbd how/when to run that)
// update: using translateChanges
// delete: when user reattaches (either this turns into an AnchorObject or it is deleted because user didn't choose it)
export interface GhostAnchorObject extends AnchorObject {
    weight: number // how likely we think this anchor point is
}

export interface AnchorOnCommit {
    id: string
    commitHash: string
    createdTimestamp: number
    html: string
    anchorText: string
    branchName: string
    // diff: string // MAYBE. Need to investigate diff packages
}

export enum Type {
    question = 'question',
    task = 'task',
    issue = 'issue',
    proposal = 'proposal',
}

export interface ChangeEvent {
    time: number
    textAdded: string
    commit: string
    branch: string
    file: string
    line: string
    charactersAdded: number
    charactersRemoved: number
}

export interface Snapshot {
    createdTimestamp: number
    snapshot: string
    anchorText: string
    githubUsername: string
    comment: string
    id: string
    anchorId: string
    deleted: boolean
    diff: string
}

export interface Reply {
    authorId: string
    createdTimestamp: number
    deleted: boolean
    githubUsername: string
    id: string
    replyContent: string
}

export const stringToShikiThemes: { [key: string]: string } = {
    'Default Dark+': 'dark-plus',
    'Default Light+': 'light-plus',
    'GitHub Dark Dimmed': 'github-dark-dimmed',
    'GitHub Dark Default': 'github-dark',
    'GitHub Dark': 'github-dark',
    'GitHub Light Default': 'github-light',
    'GitHub Light': 'github-light',
    'Light High Contrast': 'hc_light',
    'Material Theme': 'material-default',
    'Material Theme Darker': 'material-darker',
    'Material Theme Lighter': 'material-lighter',
    'Material Theme Ocean': 'material-ocean',
    'Material Theme Palenight': 'material-palenight',
    'Min Dark': 'min-dark',
    'Min Light': 'min-light',
    Monokai: 'monokai',
    Nord: 'nord',
    'One Dark Pro': 'one-dark-pro',
    poimandres: 'poimandres',
    'Rosé Pine': 'rose-pine',
    'Rosé Pine Moon': 'rose-pine-moon',
    'Rosé Pine Dawn': 'rose-pine-dawn',
    'Slack Theme Dark Mode': 'slack-dark',
    'Slack Theme Ochin': 'slack-ochin',
    'Solarized Dark': 'solarized-dark',
    'Solarized Light': 'solarized-light',
    'Vitesse Dark': 'vitesse-dark',
    'Vitesse Light': 'vitesse-light',
    css: 'css-variables',
}

export enum DEBUG_COMMANDS {
    STACK_TRACE = 'stackTrace',
    CONTINUE = 'continue',
    DISCONNECT = 'disconnect',
}

export interface GitRepoInfo {
    repo: string
    branch: string
    commit: string
    modifiedAnnotations: Annotation[]
    nameOfPrimaryBranch: string
}

export interface CommitObject {
    commit: string
    gitRepo: string
    branchName: string
    anchorsOnCommit: AnchorObject[]
    createdTimestamp: number
}
export interface TsFile {
    localFileName: string
    tsSourceFile: ts.SourceFile
}

export interface AnchorsToUpdate {
    annoId: string
    createdTimestamp: number
    anchors: AnchorObject[]
}
