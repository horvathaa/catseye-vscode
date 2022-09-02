/*
 *
 * debuggerAdapterTrackerFactory.ts
 * Required class for creating debugAdapter
 *
 */
import {
    DebugAdapterTracker,
    DebugAdapterTrackerFactory,
    DebugSession,
    ProviderResult,
} from 'vscode'
import { MessagingService } from './messagingService'
import { DebugAdapter } from './debugAdapter'

export class DebugAdapterFactory implements DebugAdapterTrackerFactory {
    private messagingService: MessagingService
    private debugSession: DebugSession

    constructor(
        debugSession: DebugSession,
        messagingService: MessagingService
    ) {
        this.messagingService = messagingService
        this.debugSession = debugSession
    }
    public createDebugAdapterTracker(
        session: DebugSession
    ): ProviderResult<DebugAdapterTracker> {
        this.debugSession = session
        return new DebugAdapter(this.debugSession, this.messagingService)
    }
}
