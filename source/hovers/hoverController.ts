import {
    languages,
    Range,
    Disposable,
    Hover,
    Uri,
    MarkdownString,
    Position,
    TextDocument,
} from 'vscode'
import { annotationList } from '../extension'
import {
    createRangeFromAnchorObject,
    getAnchorsWithGitUrl,
} from '../anchorFunctions/anchor'
import {
    getAnnotationsWithStableGitUrl,
    getStableGitHubUrl,
} from '../utils/utils'
export const maxSmallIntegerV8 = 2 ** 30
export class HoverController implements Disposable {
    private _hoverProviderDisposable: Disposable | undefined

    constructor() {
        this.register()
    }

    dispose() {
        this._hoverProviderDisposable?.dispose()
    }

    async provideAnnotationCreationHover(
        document: TextDocument,
        position: Position
    ): Promise<Hover | undefined> {
        const range = document.validateRange(
            new Range(
                position.line,
                position.character,
                position.line,
                maxSmallIntegerV8
            )
        )
        const docGitUrl = getStableGitHubUrl(document.uri.fsPath)
        const annosInFile = getAnnotationsWithStableGitUrl(
            annotationList,
            docGitUrl
        )
        const anchorsInFile = getAnchorsWithGitUrl(docGitUrl).filter(
            (a) => a.anchored
        )
        const anchorsThatContainPosition = anchorsInFile.filter((a) => {
            const range = createRangeFromAnchorObject(a)
            return range.contains(position)
        })
        if (!anchorsThatContainPosition.length) {
            return undefined
        }
        const hoverArr: MarkdownString[] = anchorsThatContainPosition.flatMap(
            (anchor) => {
                let markdownArr = new Array<MarkdownString>()
                markdownArr.push(
                    new MarkdownString(
                        annosInFile.find(
                            (a) => a.id === anchor.parentId
                        )?.annotation
                    )
                )
                const showAnnoInWebviewCommand = Uri.parse(
                    `command:catseye.showAnnoInWebview?${encodeURIComponent(
                        JSON.stringify(anchor.parentId)
                    )}`
                )
                let showAnnoInWebviewLink: MarkdownString = new MarkdownString()
                showAnnoInWebviewLink.isTrusted = true
                showAnnoInWebviewLink.appendMarkdown(
                    `[Show Annotation](${showAnnoInWebviewCommand})`
                )
                return markdownArr.concat(showAnnoInWebviewLink)
            }
        )

        return new Hover(hoverArr, range)
    }

    private register() {
        const subscriptions = []

        subscriptions.push(
            languages.registerHoverProvider(
                { scheme: 'file' },
                {
                    provideHover: this.provideAnnotationCreationHover,
                }
            )
        )

        this._hoverProviderDisposable = Disposable.from(...subscriptions)
    }
}
