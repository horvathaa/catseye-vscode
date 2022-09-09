import {
    // CancellationToken,
    languages,
    Range,
    Disposable,
    Hover,
    Uri,
    MarkdownString,
    Position,
    TextDocument,
    // DecorationOptions,
} from 'vscode'
import { annotationList } from '../extension'
import {
    createRangeFromAnchorObject,
    // getAnchorsInCurrentFile,
    getAnchorsWithGitUrl,
} from '../anchorFunctions/anchor'
import {
    getAnnotationsWithStableGitUrl,
    getStableGitHubUrl,
} from '../utils/utils'
const maxSmallIntegerV8 = 2 ** 30 // Max number that can be stored in V8's smis (small integers)
export class HoverController implements Disposable {
    // private readonly _disposable: Disposable;
    private _hoverProviderDisposable: Disposable | undefined
    // private _uri: Uri | undefined

    constructor() {
        this.register()
    }

    dispose() {
        // this._uri = undefined
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
