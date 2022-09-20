import { ListLogLine } from 'simple-git/dist/typings/response'
import { DefaultLogFields } from 'simple-git/dist/typings/types'
import { DiffFile } from 'diff2html/lib/types'
import * as ts from 'typescript'
import { CodeContext } from '../astHelper/nodeHelper'

// import * as vscode from 'vscode';
// Todo: Add lastModified field (and for replies)
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
    lastEditTime: number
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
        lastEditTime: number,
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
        this.lastEditTime = lastEditTime
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

export enum AnchorType {
    partialLine = 'PartialLine',
    oneline = 'OneLine',
    multiline = 'MultiLine',
    file = 'File',
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
    potentialReanchorSpots: PotentialAnchorObject[] // consider making optional
    anchorType: AnchorType
    //add annotation field, ridding of multiple anchors
}

// create: using re-anchor algorithm (tbd how/when to run that)
// update: using translateChanges
// delete: when user reattaches (either this turns into an AnchorObject or it is deleted because user didn't choose it)
// or parent anno is deleted OR parent anchor is deleted
export interface PotentialAnchorObject extends AnchorObject {
    weight: number // how likely we think this anchor point is
    reasonSuggested: string // why we think this anchor point is a good choice
    paoId: string
}

export const isPotentialAnchorObject = (
    obj: any
): obj is PotentialAnchorObject => {
    return obj.hasOwnProperty('reasonSuggested')
}

// why does this not have offsets?????????

export interface AnchorOnCommit {
    id: string
    commitHash: string
    createdTimestamp: number
    html: string
    anchorText: string
    branchName: string
    // startLine: number
    // endLine: number
    anchor: Anchor
    stableGitUrl: string
    path: string
    surroundingCode: SurroundingAnchorArea
    anchorType: AnchorType
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
    lastEditTime: number
}

export interface ReplyMergeInformation extends Reply {
    inAnnoBody: boolean
    annoId: string
}

export const isReply = (obj: any): obj is Reply => {
    return obj.hasOwnProperty('replyContent')
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
    anchorsOnCommit: AnchorObject[] | { [key: string]: any }[]
    createdTimestamp: number
}
export interface TsFile {
    localFileName: string
    tsSourceFile: ts.SourceFile
}

// export interface GitInfo {
// 	author: string,
// 	[key: string]: GitRepoInfo
// }

export interface Option {
    name: string
    selected: boolean
    icon: React.ReactElement
}

export interface OptionGroup {
    label: string
    options: Option[]
}

export enum AuthorOptions {
    mine = 'mine',
    others = 'others',
}

export enum Scope {
    file = 'File',
    project = 'Project',
    all = 'All',
}

export enum Sort {
    // relevance = 'Relevance',
    location = 'Location',
    time = 'Time',
}

export interface FilterOptions {
    sort: Sort
    authorOptions: OptionGroup
    typeOptions: OptionGroup
    searchText: string
    scope: Scope
    showResolved: boolean
    pinnedOnly: boolean
    showProjectOnly: boolean // Could be a different interface?
}

export interface AnchorsToUpdate {
    annoId: string
    createdTimestamp: number
    anchors: AnchorObject[]
}

export enum Selection {
    all = 'all',
    partial = 'partial',
    none = 'none',
}

export const HIGH_SIMILARITY_THRESHOLD = 0.3 // we are pretty confident the anchor is here
export const PASSABLE_SIMILARITY_THRESHOLD = 0.8 // we are confident enough
export const INCREMENT = 2 // amount for expanding search range

export const isAnchorObject = (anchor: any): anchor is AnchorObject => {
    return (
        anchor.hasOwnProperty('anchorId') &&
        anchor.hasOwnProperty('parentId') &&
        !anchor.hasOwnProperty('weight')
    )
}

export interface AnnotationAnchorPair {
    annoId: string
    anchorId: string
}

export interface MergeInformation {
    anchors: AnchorInformation[] // array of anchor ids or empty array if no anchors
    replies: ReplyMergeInformation[] // array of reply ids or empty array if no replies
    annotation: string | undefined // annotation content or undefined if unused
}

export interface AnchorInformation {
    anchorId: string
    duplicateOf: AnnotationAnchorPair[] // pair of annotation/anchor ids of duplicates OR empty if it is unique/direct child of its annotation
    hasDuplicates: AnnotationAnchorPair[]
}
export interface ReanchorInformation {
    anchorId: string
    filename: string
    stableGitUrl: string
    gitUrl: string
    anchor: Anchor
    anchorText: string
    path: CodeContext[]
    surroundingCode: SurroundingAnchorArea
}

export enum EventType {
    merge = 'Merge',
    edit = 'Edit',
    reply = 'New Reply',
    anchorAdded = 'Add Anchor',
    commit = 'Commit',
    deleted = 'Deleted',
    textChange = 'Text Change on Save',
    reanchor = 'Reanchored',
}
export interface AnnotationEvent {
    id: string
    eventUserId: string
    usersImpacted: string[]
    annotationIds: string[]
    eventType: EventType
    annotationSnapshots: AnnotationAtEvent[]
    timestamp: number
}

export interface AnnotationAtEvent {
    annotation: string
    authorId: string
    githubUsername: string
    createdTimestamp: number
    gitRepo: string
    gitBranch: string
    gitCommit: string
    id: string
    anchors: AnchorOnCommit[]
    replies: Reply[]
    resolved: boolean
    types: Type[]
}

// export interface AnchorTextPair {
//     [anchorId: string]: string
// }
// export interface AnnotationAnchorTextPair {
//     [annoId: string]: AnchorTextPair[]
// }

export interface GitDiffPathLog {
    simpleGit: DefaultLogFields & ListLogLine
    gitDiff: DiffFile[]
}

export interface HistoryAnchorObject extends AnchorObject {
    gitDiffPast: GitDiffPathLog[]
}

export const isHistoryAnchorObject = (obj: any): obj is HistoryAnchorObject => {
    return obj.hasOwnProperty('gitDiffPast')
}
