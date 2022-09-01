/*
 *
 * messagingService.ts
 * Class to facilitate communication between debugAdapter and the catseye panel
 *
 */

import { Webview } from 'vscode'
export class MessagingService {
    private currentWebviewTarget: Webview | undefined

    constructor(currentWebviewTarget: Webview | undefined) {
        this.currentWebviewTarget = currentWebviewTarget
    }
    public setWebview(webview: Webview) {
        this.currentWebviewTarget = webview
    }

    // Send a message to webview if it exists - refactor into our message sending protocol
    public sendMessageToWebview(command: string, stateToSend: Object) {
        if (this.currentWebviewTarget) {
            this.currentWebviewTarget.postMessage({
                command,
                state: { ...stateToSend },
            })
        }
    }
    public sendStartMessage(e: any) {
        return
    }
    public sendPauseMessage(e: any) {
        return
    }
}
