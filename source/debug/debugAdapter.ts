import { DebugAdapterTracker, DebugConsole, DebugSession, window, debug, SourceBreakpoint } from "vscode";
import { Location } from 'vscode'
// import { DebuggerCommunicationService } from "../service/debuggerCommunicationService";
import { MessagingService } from "./messagingService";
import { DebugProtocol } from "@vscode/debugprotocol";
import { annotationList, gitInfo, user } from "../extension";
import { getAllAnnotationsWithAnchorInFile } from '../utils/utils';
import { getAnchorsInCurrentFile, createRangeFromAnchorObject } from '../anchorFunctions/anchor';
import { Annotation, Reply } from '../constants/constants';
import { createVerify } from "crypto";
import { handleUpdateAnnotation } from "../viewHelper/viewHelper";
import { v4 as uuidv4 } from 'uuid';
import { formatTimestamp } from "../view/app/utils/viewUtils";
// import { DebugSession } from "@vscode/debugadapter";

export interface AnnoBreakpoint {
    location: Location,
    needToUpdate: boolean,
    annoId: string,
    anchorId: string,
    breakpointId: string
}

export class DebugAdapter implements DebugAdapterTracker {
    private readonly _console: DebugConsole | undefined;
    private readonly messagingService: MessagingService;
    private readonly debugSession: DebugSession;
    private needToUpdate: boolean;
    private annoBreakpoints: AnnoBreakpoint[];
    // private debugCommunicationService: DebuggerCommunicationService;
    constructor(
        debugSession: DebugSession,
        messagingService: MessagingService,
        // debugCommunicationService: DebuggerCommunicationService
    ) {
        this.debugSession = debugSession;
        this._console = debugSession.configuration.console;
        this.messagingService = messagingService;
        this.needToUpdate = false;
        this.annoBreakpoints = [];
        // this.debugCommunicationService = debugCommunicationService;
    }
    onWillStartSession() {
        // To Implement
        if(!window.activeTextEditor) {
            return;
        }
        // else if(window.activeTextEditor) {
        const annos: Annotation[] | undefined = window.activeTextEditor && getAllAnnotationsWithAnchorInFile(annotationList, window.activeTextEditor?.document.uri.toString()); 
        if(annos) {
            let breakpoints: SourceBreakpoint[] = [];
            const uri = window.activeTextEditor.document.uri;
            annos.forEach(a => {
                const anchors = getAnchorsInCurrentFile([a]);
                breakpoints = breakpoints.concat(anchors.map(
                    (anch) => { 
                        let location = new Location(uri, createRangeFromAnchorObject(anch));
                        this.annoBreakpoints.push({ location, needToUpdate: false, annoId: a.id, anchorId: anch.anchorId, breakpointId: "" });
                        return new SourceBreakpoint(location)
                    }
                ));
            });
            console.log('b', breakpoints);
            breakpoints.length === this.annoBreakpoints.length && this.annoBreakpoints.forEach((v, i) => {
                v.breakpointId = breakpoints[i].id;
            });
            console.log('br', this.annoBreakpoints);
            debug.addBreakpoints(breakpoints);
            
        }
        // }

    }

    // @override
    onWillReceiveMessage(message: any): void {
        // console.log('heewoo', message);
        if (message.command) {
            
            // Only send pertinent debug messages
            switch ((message as DebugProtocol.Request).command as string) {
                case "continue":
                    this.messagingService.sendStartMessage(message);
                    break;
                case "stackTrace":
                    this.messagingService.sendPauseMessage(message);
                    break;
                case "variables":
                    this.onVariablesRequest(message);
                    break;
                // case DEBUG_COMMANDS.DISCONNECT:
                //     // Triggered on stop event for debugger
                //     if (!message.arguments.restart) {
                //         this.debugCommunicationService.handleStopEvent();
                //     }
                //     break;
            }
        }
    }

    onDidSendMessage(message: any) {
        // console.log('huh', message);
        // console.log(window.activeTextEditor)
        if (message.command) {
            
            // Only send pertinent debug messages
            switch ((message as DebugProtocol.Request).command as string) {
                case "stackTrace":
                    // this.messagingService.sendStartMessage(message);
                    console.log('stack trace', message.body);
                    console.log('locations', this.annoBreakpoints);
                    if(this.annoBreakpoints.length && message.body.stackFrames.length) {
                        // const objs = this.annoBreakpoints.filter()
                        const files = [ ... new Set(this.annoBreakpoints.map(b => this.cleanPath(b.location.uri.fsPath))) ];
                        console.log('files', files);
                        const possibleMatchingStackFrames: any[] = message.body.stackFrames.filter((sf: any) => files.includes(this.cleanPath(sf.source.path)));
                        console.log('possible', possibleMatchingStackFrames);
                        if(possibleMatchingStackFrames.length !== 1) return; // later do something smarter here
                        const annoBreakpoint = this.annoBreakpoints.find(b => 
                            (b.location.range.start.line + 1) === possibleMatchingStackFrames[0].line && 
                            this.cleanPath(b.location.uri.fsPath) === this.cleanPath(possibleMatchingStackFrames[0].source.path)
                        );
                        console.log('ab', annoBreakpoint);
                        if(annoBreakpoint && user) {
                            console.log('found this', annoBreakpoint);
                            const anno = annotationList.find(a => a.id === annoBreakpoint.annoId);
                            const anchor = anno?.anchors.find(a => a.anchorId === annoBreakpoint.anchorId);
                            const autoReply: Reply = {
                                authorId: user.uid,
                                createdTimestamp: new Date().getTime(),
                                deleted: false,
                                githubUsername: gitInfo.author, // make interface for gitInfo
                                id: uuidv4(),
                                replyContent: `${anchor?.anchorText} ran at ${formatTimestamp(new Date().getTime())}`
                            }
                            this.annoBreakpoints = this.annoBreakpoints.map(b => {
                                return b.breakpointId === annoBreakpoint.breakpointId ? { ...annoBreakpoint, needToUpdate: true } : b
                            });
                            handleUpdateAnnotation(annoBreakpoint.annoId, 'replies', anno?.replies.concat(autoReply));
                        }
                    }
                    break;
                case "variables":
                    console.log('variables', message.body);
                    const abNeedsUpdating = this.annoBreakpoints.find(b => b.needToUpdate);
                    console.log('ab', abNeedsUpdating)
                    if(abNeedsUpdating) {
                        const mostRecentVariable = message.body.variables[message.body.variables.length - 1];
                        const output = JSON.stringify(mostRecentVariable);
                        // this.transmitAutoReply(abNeedsUpdating, output);
                        this.annoBreakpoints = this.annoBreakpoints.map(b => {
                            return b.breakpointId === abNeedsUpdating.breakpointId ? { ...abNeedsUpdating, needToUpdate: false } : b
                        });
                    }
                    // this.messagingService.sendPauseMessage(message);
                    break;
                // case "variables":
                //     this.onVariablesRequest(message);
                //     break;
                // case DEBUG_COMMANDS.DISCONNECT:
                //     // Triggered on stop event for debugger
                //     if (!message.arguments.restart) {
                //         this.debugCommunicationService.handleStopEvent();
                //     }
                //     break;
            }
        }
    }

    private onVariablesRequest(r: DebugProtocol.VariablesRequest) {
        // console.log('got em', r);
    }
    // A debugger error should unlock the webview
    onError() {
        this.messagingService.sendStartMessage('error');
    }
    // Device is always running when exiting debugging mode
    onExit() {
        this.messagingService.sendStartMessage('exit');
    }

    cleanPath(path: string) {
        return path.toLowerCase().replace(/\\/g, "").replace(/\//g, "");
    }

    transmitAutoReply(annoBreakpoint: AnnoBreakpoint, content: string) {
        const anno = annotationList.find(a => a.id === annoBreakpoint.annoId);
        // const anchor = anno?.anchors.find(a => a.anchorId === annoBreakpoint.anchorId);
        const autoReply: Reply = {
            authorId: user ? user.uid : "",
            createdTimestamp: new Date().getTime(),
            deleted: false,
            githubUsername: gitInfo.author, // make interface for gitInfo
            id: uuidv4(),
            replyContent: content
        }
        
        handleUpdateAnnotation(annoBreakpoint.annoId, 'replies', anno?.replies.concat(autoReply));
    }
}