import * as vscode from 'vscode';
import { DebugAdapterFactory } from './debuggerAdapterTrackerFactory';
import { MessagingService } from './messagingService';
import { view } from '../extension';

// import { DebugAdapterTrackerFactory } from 'vscode'; // https://github.com/microsoft/vscode-python-devicesimulator/blob/274869a67677b4038a6686cdb86123fc7b3094da/src/debugger/debugAdapterFactory.ts
export const handleOnDidStartDebugSession = (e: vscode.DebugSession) => {
    const debugAdapterFactory = new DebugAdapterFactory(e, new MessagingService(view?._panel?.webview));
    vscode.debug.registerDebugAdapterTrackerFactory("*", debugAdapterFactory);
    return;
}

export * from './debugAdapter';
export * from './debuggerAdapterTrackerFactory';
export * from './messagingService';