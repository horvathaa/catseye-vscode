/*
 *
 * debugAdapter.ts
 * Handles listening for debug events that we can interpret and support with annotations
 *
 */

import {
    DebugAdapterTracker,
    // DebugConsole,
    DebugSession,
    window,
    debug,
    SourceBreakpoint,
    Location,
} from 'vscode'

import { MessagingService } from './messagingService'
import {
    DebugProtocol,
    // DebuggerCommunicationService,
} from '@vscode/debugprotocol'
import { annotationList, gitInfo, user } from '../extension'
import { getAllAnnotationsWithAnchorInFile } from '../utils/utils'
import {
    getAnchorsInCurrentFile,
    createRangeFromAnchorObject,
} from '../anchorFunctions/anchor'
import { Annotation, Reply } from '../constants/constants'
import { handleUpdateAnnotation } from '../viewHelper/viewHelper'
import { v4 as uuidv4 } from 'uuid'
import { formatTimestamp } from '../view/app/utils/viewUtils'

export interface AnnoBreakpoint {
    location: Location
    needToUpdate: boolean
    annoId: string
    anchorId: string
    breakpointId: string
}

export class DebugAdapter implements DebugAdapterTracker {
    private readonly messagingService: MessagingService
    private debugSession: DebugSession
    private annoBreakpoints: AnnoBreakpoint[]
    // private debugCommunicationService: DebuggerCommunicationService
    constructor(
        debugSession: DebugSession,
        messagingService: MessagingService
        // debugCommunicationService: DebuggerCommunicationService
    ) {
        this.messagingService = messagingService
        this.annoBreakpoints = []
        this.debugSession = debugSession
        // this.debugCommunicationService = debugCommunicationService;
    }
    onWillStartSession() {
        // console.log('starting this session', this.debugSession)
        if (!window.activeTextEditor) {
            return
        }

        const annos: Annotation[] | undefined =
            window.activeTextEditor &&
            getAllAnnotationsWithAnchorInFile(
                annotationList,
                window.activeTextEditor?.document.uri.toString()
            )
        if (annos) {
            let breakpoints: SourceBreakpoint[] = []
            const uri = window.activeTextEditor.document.uri
            annos.forEach((a) => {
                const anchors = getAnchorsInCurrentFile([a])
                breakpoints = breakpoints.concat(
                    anchors.map((anch) => {
                        let location = new Location(
                            uri,
                            createRangeFromAnchorObject(anch)
                        )
                        this.annoBreakpoints.push({
                            location,
                            needToUpdate: false,
                            annoId: a.id,
                            anchorId: anch.anchorId,
                            breakpointId: '',
                        })
                        return new SourceBreakpoint(location)
                    })
                )
            })
            breakpoints.length === this.annoBreakpoints.length &&
                this.annoBreakpoints.forEach((v, i) => {
                    v.breakpointId = breakpoints[i].id
                })
            debug.addBreakpoints(breakpoints)
        }
        // }
    }

    // @override
    onWillReceiveMessage(message: any): void {
        if (message.command) {
            // Only send pertinent debug messages
            switch ((message as DebugProtocol.Request).command as string) {
                case 'continue':
                    this.messagingService.sendStartMessage(message)
                    break
                case 'stackTrace':
                    this.messagingService.sendPauseMessage(message)
                    break
                case 'variables':
                    this.onVariablesRequest(message)
                    break
            }
        }
    }

    // @override
    onDidSendMessage(message: any) {
        if (message.command) {
            // Only send pertinent debug messages
            switch ((message as DebugProtocol.Request).command as string) {
                case 'stackTrace':
                    if (
                        this.annoBreakpoints.length &&
                        message.body.stackFrames.length
                    ) {
                        const files = [
                            ...new Set(
                                this.annoBreakpoints.map((b) =>
                                    this.cleanPath(b.location.uri.fsPath)
                                )
                            ),
                        ]

                        const possibleMatchingStackFrames: any[] =
                            message.body.stackFrames.filter((sf: any) =>
                                files.includes(this.cleanPath(sf.source.path))
                            )
                        if (possibleMatchingStackFrames.length !== 1) return // later do something smarter here
                        const annoBreakpoint = this.annoBreakpoints.find(
                            (b) =>
                                b.location.range.start.line + 1 ===
                                    possibleMatchingStackFrames[0].line &&
                                this.cleanPath(b.location.uri.fsPath) ===
                                    this.cleanPath(
                                        possibleMatchingStackFrames[0].source
                                            .path
                                    )
                        )

                        if (annoBreakpoint && user) {
                            const anno = annotationList.find(
                                (a) => a.id === annoBreakpoint.annoId
                            )
                            const anchor = anno?.anchors.find(
                                (a) => a.anchorId === annoBreakpoint.anchorId
                            )
                            const createdTimestamp = new Date().getTime()
                            const autoReply: Reply = {
                                authorId: user.uid,
                                createdTimestamp: createdTimestamp,
                                deleted: false,
                                githubUsername: gitInfo.author, // make interface for gitInfo
                                id: uuidv4(),
                                replyContent: `${
                                    anchor?.anchorText
                                } ran at ${formatTimestamp(createdTimestamp)}`,
                                lastEditTime: createdTimestamp,
                            }
                            this.annoBreakpoints = this.annoBreakpoints.map(
                                (b) => {
                                    return b.breakpointId ===
                                        annoBreakpoint.breakpointId
                                        ? {
                                              ...annoBreakpoint,
                                              needToUpdate: true,
                                          }
                                        : b
                                }
                            )
                            handleUpdateAnnotation(
                                annoBreakpoint.annoId,
                                'replies',
                                anno?.replies.concat(autoReply)
                            )
                        }
                    }
                    break
                case 'variables':
                    const abNeedsUpdating = this.annoBreakpoints.find(
                        (b) => b.needToUpdate
                    )
                    if (abNeedsUpdating) {
                        // const mostRecentVariable =
                        //     message.body.variables[
                        //         message.body.variables.length - 1
                        //     ]
                        // const output = JSON.stringify(mostRecentVariable)
                        // this.transmitAutoReply(abNeedsUpdating, output);
                        this.annoBreakpoints = this.annoBreakpoints.map((b) => {
                            return b.breakpointId ===
                                abNeedsUpdating.breakpointId
                                ? { ...abNeedsUpdating, needToUpdate: false }
                                : b
                        })
                    }

                    break
            }
        }
    }

    private onVariablesRequest(r: DebugProtocol.VariablesRequest) {
        return
    }
    // A debugger error should unlock the webview
    onError() {
        this.messagingService.sendStartMessage('error')
    }
    // Device is always running when exiting debugging mode
    onExit() {
        this.messagingService.sendStartMessage('exit')
    }

    cleanPath(path: string) {
        return path.toLowerCase().replace(/\\/g, '').replace(/\//g, '')
    }

    transmitAutoReply(annoBreakpoint: AnnoBreakpoint, content: string) {
        const anno = annotationList.find((a) => a.id === annoBreakpoint.annoId)
        const createdTimestamp = new Date().getTime()
        // const anchor = anno?.anchors.find(a => a.anchorId === annoBreakpoint.anchorId);
        const autoReply: Reply = {
            authorId: user ? user.uid : '',
            createdTimestamp,
            deleted: false,
            githubUsername: gitInfo.author, // make interface for gitInfo
            id: uuidv4(),
            replyContent: content,
            lastEditTime: createdTimestamp,
        }

        handleUpdateAnnotation(
            annoBreakpoint.annoId,
            'replies',
            anno?.replies.concat(autoReply)
        )
    }
}
