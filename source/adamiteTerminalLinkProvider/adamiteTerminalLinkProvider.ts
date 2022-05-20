import { view } from '../extension';
import { CancellationToken, TerminalLinkContext, TerminalLinkProvider, ProviderResult, TerminalLink } from 'vscode';

interface AdamiteTerminalLink extends TerminalLink {
    content: string;
}

export class AdamiteTerminalLinkProvider implements TerminalLinkProvider {
    public provideTerminalLinks(context: TerminalLinkContext, token: CancellationToken) : ProviderResult<AdamiteTerminalLink[]> {
        if(view) {
            const startIndex: number = 0;
            const lengthOfLink: number = context.line.length;
            const tooltip: string = "Add to Selected Annotation";
            return [{ startIndex, length: lengthOfLink, tooltip, content: context.line }];
        }
        else {
            return [];
        }
        
    }

    public async handleTerminalLink(link: AdamiteTerminalLink) : Promise<void> {
        view?.addTerminalMessage(link.content);
        // text
    }
}   