import { Webview } from "vscode";

// import { VSCODE_MESSAGES_TO_WEBVIEW } from "../view/constants";
// import { DeviceSelectionService } from "./deviceSelectionService";
export class MessagingService {
    private currentWebviewTarget: Webview | undefined;
    // private deviceSelectionService: DeviceSelectionService;

    constructor(currentWebviewTarget: Webview | undefined) {
        this.currentWebviewTarget = currentWebviewTarget;
    }
    public setWebview(webview: Webview) {
        this.currentWebviewTarget = webview;
    }

    // Send a message to webview if it exists
    public sendMessageToWebview(command: string, stateToSend: Object) {
        if (this.currentWebviewTarget) {
            this.currentWebviewTarget.postMessage({
                command,
                // active_device: this.deviceSelectionService.getCurrentActiveDevice(),
                state: { ...stateToSend },
            });
        }
    }
    public sendStartMessage(e: any) {
        console.log('e - send start', e)
        // this.currentWebviewTarget?.postMessage({
        //     command: VSCODE_MESSAGES_TO_WEBVIEW.RUN_DEVICE,
        // });
    }
    public sendPauseMessage(e: any) {
        console.log('e - send pause', e);
        // this.currentWebviewTarget?.postMessage({
        //     command: VSCODE_MESSAGES_TO_WEBVIEW.PAUSE_DEVICE,
        // });
    }
}