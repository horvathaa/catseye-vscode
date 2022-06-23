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
    private debugSession: DebugSession
    private messagingService: MessagingService

    constructor(
        debugSession: DebugSession,
        messagingService: MessagingService
    ) {
        this.debugSession = debugSession
        this.messagingService = messagingService
    }
    public createDebugAdapterTracker(
        session: DebugSession
    ): ProviderResult<DebugAdapterTracker> {
        return new DebugAdapter(session, this.messagingService)
    }
}
