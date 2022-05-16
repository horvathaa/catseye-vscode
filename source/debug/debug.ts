import * as vscode from 'vscode';
import { DebugAdapterFactory } from './debuggerAdapterTrackerFactory';
import { MessagingService } from './messagingService';
import { view } from '../extension';
import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent, InvalidatedEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint, MemoryEvent
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
// import { DebugAdapterTrackerFactory } from 'vscode'; // https://github.com/microsoft/vscode-python-devicesimulator/blob/274869a67677b4038a6686cdb86123fc7b3094da/src/debugger/debugAdapterFactory.ts
export const handleOnDidStartDebugSession = (e: vscode.DebugSession) => {
    console.log('yes', e);
    console.log('console', vscode.debug.activeDebugConsole);
    console.log('breakpoints', vscode.debug.breakpoints);
    // if(view && view._panel) {
    
    // }
    const debugAdapterFactory = new DebugAdapterFactory(e, new MessagingService(view?._panel?.webview));
    vscode.debug.registerDebugAdapterTrackerFactory("*", debugAdapterFactory);

    // DebugAdapterTrackerFactory
    // vscode.debug.registerDebugAdapterTrackerFactory("*", DebugAdapterTrackerFactory)
}

// class MockDebugSession extends LoggingDebugSession {
//     private _variableHandles = new Handles<'locals' | 'globals'>();

//     protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {

// 		let vs: RuntimeVariable[] = [];

// 		const v = this._variableHandles.get(args.variablesReference);
// 		if (v === 'locals') {
// 			vs = this._runtime.getLocalVariables();
// 		} else if (v === 'globals') {
// 			if (request) {
// 				this._cancellationTokens.set(request.seq, false);
// 				vs = await this._runtime.getGlobalVariables(() => !!this._cancellationTokens.get(request.seq));
// 				this._cancellationTokens.delete(request.seq);
// 			} else {
// 				vs = await this._runtime.getGlobalVariables();
// 			}
// 		} else if (v && Array.isArray(v.value)) {
// 			vs = v.value;
// 		}

// 		response.body = {
// 			variables: vs.map(v => this.convertFromRuntime(v))
// 		};
// 		this.sendResponse(response);
// 	}

// }

export * from './debugAdapter';
export * from './debuggerAdapterTrackerFactory';
export * from './messagingService';