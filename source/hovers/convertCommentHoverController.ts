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
    createRangeFromObject,
    getAnchorsWithGitUrl,
} from '../anchorFunctions/anchor'
import {
    getAnnotationsWithStableGitUrl,
    getStableGitHubUrl,
} from '../utils/utils'
import { CommentConfigHandler } from '../commentConfigHandler/commentConfigHandler'
import { getCodeLine } from '../anchorFunctions/reanchor'
const maxSmallIntegerV8 = 2 ** 30 // whjy this again? why does this work for anno and not this im confused

const createRangeFromTokenData = (obj: any): Range => {
    if (obj.hasOwnProperty('endLine') && obj.hasOwnProperty('startLine')) {
        return new Range(
            new Position(obj.startLine, obj.startOffset),
            new Position(obj.endLine, obj.endOffset)
        )
    } else {
        return new Range(
            new Position(obj.line, obj.startOffset),
            new Position(obj.line, obj.endOffset)
        )
    }
}
export class ConvertCommentHoverController implements Disposable {
    private _hoverProviderDisposable: Disposable | undefined

    constructor() {
        this.register()
    }

    dispose() {
        this._hoverProviderDisposable?.dispose()
    }

    async provideCommentAnnotationCreationHover(
        document: TextDocument,
        position: Position
    ): Promise<Hover | undefined> {
        const range = document.validateRange(
            new Range(
                position.line,
                position.character,
                position.line,
                position.character
            )
        )

        const codeLines = getCodeLine(document.getText())

        const commentConfigHandler = new CommentConfigHandler()
        // console.log('handler', commentConfigHandler, 'wtf', document.languageId)
        const commentCfg = commentConfigHandler.getCommentConfig(
            document.languageId
        )
        // console.log('commentCfg', commentCfg)

        function escapeRegex(string: string) {
            return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        }

        const commentLineDelimiter = commentCfg?.lineComment ?? '//'
        // console.log('commentLineDelimeter', commentLineDelimiter)

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
                const match = l.code.find(
                    (c) => c.token === commentCfg?.lineComment
                )
                let newRange = undefined
                const text = l.code.map((c) => c.token).join(' ')
                let commentContent =
                    type === 'wholeLine'
                        ? text.replace(commentLineDelimiter, '').trim()
                        : text.split(commentLineDelimiter)[1].trim()
                if (type === 'wholeLine') {
                    const attachLine = codeLines.find(
                        (codeLine) => codeLine.line === l.line + 1
                    )
                    if (attachLine && !attachLine.isEmptyLine) {
                        newRange = document.validateRange(
                            new Range(
                                attachLine.line,
                                attachLine.code[0].offset,
                                attachLine.line,
                                attachLine.code[attachLine.code.length - 1]
                                    .offset +
                                    attachLine.code[attachLine.code.length - 1]
                                        .token.length
                            )
                        )
                    } else {
                        const aboveLine = codeLines.find(
                            (codeLine) => codeLine.line === l.line - 1
                        )
                        if (aboveLine && !aboveLine.isEmptyLine) {
                            newRange = document.validateRange(
                                new Range(
                                    aboveLine.line,
                                    aboveLine.code[0].offset,
                                    aboveLine.line,
                                    aboveLine.code[aboveLine.code.length - 1]
                                        .offset +
                                        aboveLine.code[
                                            aboveLine.code.length - 1
                                        ].token.length
                                )
                            )
                        }
                    }
                } else if (type === 'trailing') {
                    newRange =
                        match &&
                        document.validateRange(
                            new Range(
                                l.line,
                                l.code[0].offset,
                                // match.offset,
                                l.line,
                                match.offset - 1
                            )
                        )
                }
                // &&
                match &&
                    newRange &&
                    comments.push({
                        ...l,
                        type,
                        startOffset: match.offset,
                        endOffset:
                            l.code[l.code.length - 1].offset +
                            l.code[l.code.length - 1].token.length,
                        newContent: { commentContent, range: newRange },
                    })
            } else if (blockRegexOpen.test(lineText)) {
                const blockQuoteChar =
                    commentCfg && commentCfg?.blockComment
                        ? commentCfg.blockComment[0]
                        : '/*'
                const startBlock = l.code.find(
                    (c) => c.token === blockQuoteChar
                )
                blockCommentQueue.push({
                    ...l,
                    type: 'blockComment',
                    startLine: l.line,
                    startOffset: startBlock?.offset ?? 0,
                })
            } else if (blockRegexClose.test(lineText)) {
                if (blockCommentQueue.length) {
                    const blockQuoteChar =
                        commentCfg && commentCfg?.blockComment
                            ? commentCfg.blockComment[1]
                            : '/*'
                    const blockQuoteOpenChar =
                        commentCfg && commentCfg?.blockComment
                            ? commentCfg.blockComment[0]
                            : '/*'
                    const endBlock = l.code.find(
                        (c) => c.token === blockQuoteChar
                    )
                    const blockContent = blockCommentQueue.pop()
                    let commentContent = document
                        .getText(
                            new Range(
                                blockContent.startLine,
                                blockContent.startOffset,
                                l.line,
                                endBlock?.offset
                                    ? endBlock.offset + endBlock.token.length
                                    : blockQuoteChar.length
                            )
                        )
                        .replace(blockQuoteChar, '')
                        .replace(blockQuoteOpenChar, '')
                        .trim()

                    let attachLine
                    let i = l.line
                    let goingUp = false
                    do {
                        if (!goingUp) {
                            attachLine = codeLines.find(
                                (cl) => cl.line === i + 1
                            )
                            i++
                        }
                        if (!attachLine) {
                            goingUp = true
                            attachLine = codeLines.find(
                                (cl) => cl.line === i - 1
                            )
                            i--
                        }
                    } while (!attachLine || attachLine.isEmptyLine)
                    let newRange = new Range(
                        attachLine.line,
                        attachLine.code[0].offset,
                        attachLine.line,
                        attachLine.code[attachLine.code.length - 1].offset +
                            attachLine.code[attachLine.code.length - 1].token
                                .length
                    )
                    const newComment = {
                        ...blockContent,
                        endLine: l.line,
                        endOffset: endBlock?.offset ?? blockQuoteChar.length,
                        newContent: { commentContent, range: newRange },
                    }
                    comments.push(newComment)
                }
            }
        })

        const match = comments.find((c) => {
            let commentRange = document.validateRange(
                createRangeFromTokenData(c)
            )
            return commentRange.contains(range)
        })

        if (!match) return undefined

        let markdownArr = new Array<MarkdownString>()
        const originalRange = document.validateRange(
            createRangeFromTokenData(match)
        )
        const convertCommentToAnnotationCommand = Uri.parse(
            `command:catseye.createAutomatedAnnotation?${encodeURIComponent(
                JSON.stringify({
                    range: match.newContent.range,
                    annotationContent: match.newContent.commentContent,
                    documentUri: document.uri.fsPath,
                    originalRange,
                })
            )}`
        )

        let convertCommentLink: MarkdownString = new MarkdownString()
        convertCommentLink.isTrusted = true
        convertCommentLink.appendMarkdown(
            `[Convert Comment to Annotation](${convertCommentToAnnotationCommand})`
        )
        markdownArr.push(convertCommentLink)

        return new Hover(markdownArr, originalRange)
    }

    private register() {
        const subscriptions = []
        // console.log('hewwo??')
        subscriptions.push(
            languages.registerHoverProvider(
                { scheme: 'file' },
                {
                    provideHover: this.provideCommentAnnotationCreationHover,
                }
            )
        )

        this._hoverProviderDisposable = Disposable.from(...subscriptions)
    }
}
