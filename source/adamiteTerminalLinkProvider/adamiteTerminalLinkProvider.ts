/*
 *
 * catseye Terminal Link Provider
 * Used to connect into the user's terminal for capturing code output
 * Not currently used as it is very limited (can only capture one line and require overriding default clickable link behavior)
 *
 */

import { view } from '../extension'
import {
    CancellationToken,
    TerminalLinkContext,
    TerminalLinkProvider,
    ProviderResult,
    TerminalLink,
} from 'vscode'

interface catseyeTerminalLink extends TerminalLink {
    content: string
}

export class catseyeTerminalLinkProvider implements TerminalLinkProvider {
    public provideTerminalLinks(
        context: TerminalLinkContext,
        token: CancellationToken
    ): ProviderResult<catseyeTerminalLink[]> {
        if (view) {
            const startIndex: number = 0
            const lengthOfLink: number = context.line.length
            const tooltip: string = 'Add to Selected Annotation'
            return [
                {
                    startIndex,
                    length: lengthOfLink,
                    tooltip,
                    content: context.line,
                },
            ]
        } else {
            return []
        }
    }

    public async handleTerminalLink(link: catseyeTerminalLink): Promise<void> {
        view?.addTerminalMessage(link.content)
        // text
    }
}
