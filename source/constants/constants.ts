import ts = require('typescript')
import { CodeContext } from '../astHelper/nodeHelper'

// import * as vscode from 'vscode';
export class Annotation {
    id: string
    annotation: string
    anchors: AnchorObject[]
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
        types?: Type[]
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
    }
}

export interface Anchor {
    startLine: number
    endLine: number
    startOffset: number
    endOffset: number
}

export interface AnchorObject {
    anchor: Anchor
    anchorText: string
    html: string
    filename: string
    gitUrl: string
    stableGitUrl: string
    visiblePath: string
    anchorPreview: string
    programmingLang: string
    anchorId: string
    originalCode: string
    parentId: string
    path: CodeContext[]
    //add annotation field, ridding of multiple anchors
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

export interface TsFile {
    localFileName: string
    tsSourceFile: ts.SourceFile
}

// export interface GitInfo {
// 	author: string,
// 	[key: string]: GitRepoInfo
// }
