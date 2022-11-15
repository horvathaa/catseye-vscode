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
import { CommentConfigHandler } from '../commentConfigHandler/commentConfigHandler'
import { getCodeLine } from '../anchorFunctions/reanchor'
const maxSmallIntegerV8 = 2 ** 30
export class ConvertCommentHoverController implements Disposable {
    private _hoverProviderDisposable: Disposable | undefined

    constructor() {
        this.register()
    }

    dispose() {
        this._hoverProviderDisposable?.dispose()
    }

    private findAndTokenizeComments(document: TextDocument) {
        const codeLines = getCodeLine(document.getText())
        // const tokenized = ts.createSourceFile(
        //     TextEditor.document.fileName,
        //     TextEditor.document.getText(),
        //     ts.ScriptTarget.Latest
        // )

        const commentConfigHandler = new CommentConfigHandler()
        console.log('handler', commentConfigHandler, 'wtf', document.languageId)
        const commentCfg = commentConfigHandler.getCommentConfig(
            document.languageId
        )
        console.log('commentCfg', commentCfg)

        function escapeRegex(string: string) {
            return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        }

        const commentLineDelimiter = commentCfg?.lineComment
        console.log('commentLineDelimeter', commentLineDelimiter)

        const regex = new RegExp(
            `\s*${escapeRegex(commentLineDelimiter ?? '//')}.*`,
            'ig'
        )
        const blockRegexOpen = new RegExp(
            `\s*${escapeRegex(
                commentCfg && commentCfg.blockComment
                    ? commentCfg.blockComment[0]
                    : '/*'
            )}.*`,
            'ig'
        )

        const blockRegexClose = new RegExp(
            `\s*${escapeRegex(
                commentCfg && commentCfg.blockComment
                    ? commentCfg.blockComment[1]
                    : '*/'
            )}.*`,
            'ig'
        )
        const comments: any[] = []
        const blockCommentQueue: any[] = []
        codeLines.forEach((l) => {
            const lineText = l.code.map((c) => c.token).join(' ')
            // console.log('lineText', lineText)
            const isLineComment = regex.test(lineText)
            // ||
            // blockRegexOpen.test(lineText) ||
            // blockRegexClose.test(lineText)

            if (isLineComment) {
                const type =
                    l.code[0].token === commentCfg?.lineComment
                        ? 'wholeLine'
                        : 'trailing'
                l.code.find((c) => c.token === commentCfg?.lineComment) &&
                    comments.push({ ...l, type })
            } else if (blockRegexOpen.test(lineText)) {
                blockCommentQueue.push({
                    ...l,
                    type: 'blockComment',
                    startLine: l.line,
                })
            } else if (blockRegexClose.test(lineText)) {
                if (blockCommentQueue.length) {
                    const newComment = {
                        ...blockCommentQueue.pop(),
                        endLine: l.line,
                    }
                    comments.push(newComment)
                }
            }
        })

        const commentRanges = comments.map((c) => {
            if (c.type === 'wholeLine') {
                let commentContent = c.text.replace(commentLineDelimiter, '')
                const attachLine = codeLines.find(
                    (codeLine) => codeLine.line === c.line + 1
                )
                if (attachLine) {
                    const range = document.validateRange(
                        new Range(
                            attachLine.line,
                            attachLine.code[0].offset,
                            attachLine.line,
                            attachLine.code[attachLine.code.length - 1].offset
                        )
                    )
                }
            }
        })
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
