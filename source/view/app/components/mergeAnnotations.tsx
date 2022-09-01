/*
 *
 * newAnnotation.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent, useMediaQuery } from '@material-ui/core'
import { Grid, Checkbox } from '@mui/material'
import List from '@mui/material/List'
import * as React from 'react'
import styles from '../styles/annotation.module.css'
import TextEditor from './annotationComponents/textEditor'
import {
    breakpoints,
    buildAnnotation,
    buildEmptyAnnotation,
    getStringDifference,
} from '../utils/viewUtils'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import DeleteIcon from '@mui/icons-material/Delete'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
    cardStyle,
} from '../styles/vscodeStyles'
// import styles from '../styles/annotation.module.css'
import anchorStyles from '../styles/versions.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import {
    AnchorInformation,
    AnchorObject,
    AnchorOnCommit,
    Annotation,
    AnnotationAnchorPair,
    isAnchorObject,
    MergeInformation,
    Reply,
    ReplyMergeInformation,
    Type,
} from '../../../constants/constants'
import CatseyeButton from './annotationComponents/CatseyeButton'
import AnchorIcon from '@mui/icons-material/Anchor'
import ReplyContainer from './annotationComponents/replyContainer'
import ReactAnnotation from './annotation'
import AnnotationReference from './annotationReference'
import Carousel from 'react-material-ui-carousel'
import { PastVersion } from './annotationComponents/pastVersions'
import { createAnchorOnCommitFromAnchorObject } from './annotationComponents/anchorCarousel'
import { format } from 'path'
import { ConstructionOutlined } from '@mui/icons-material'

interface DB {
    [anchorText: string]: DuplicateBundle
}
interface DuplicateBundle {
    annoIds: string[]
    anchorIds: string[]
}

enum AnnotationBodySources {
    Annotation = 'annotation',
    Reply = 'reply',
    User = 'user',
    AuthorNameList = 'githubUsernames',
}

interface AnnotationBodyMetaData {
    source: AnnotationBodySources // can either be user, reply, or annotation
    annoId: string // corresponding annotation and/or reply IDs, or made up user id
    // startOffset: number // ya hate to see it
    // endOffset: number
    content: string // what to actually print out
    githubUsername: string // author of content
    timestamp: number
    // replies?: AnnotationBodyLocationMetaData[]
    replyId?: string // if this is a reply, have ID here
}

interface AnnotationBodyLocationMetaData extends AnnotationBodyMetaData {
    // startOffset: number
    // endOffset: number
    offsets: Selection
}

interface Selection {
    startOffset: number
    endOffset: number
}

interface SurroundingMetadata {
    insertionType: InsertionType
    index: number
    otherInformation?: any
}

enum InsertionType {
    Inside = 'inside',
    Before = 'before',
    After = 'after',
}

enum DeletionType {
    ContainsDeletion = 'containsDeletion',
    DeletionContains = 'deletionContains',
    DeletionStarts = 'deletionStarts',
    DeletionEnds = 'deletionEnds',
    AfterDeletion = 'afterDeletion',
    NoRelation = 'noRelation',
}

interface UserAddedText {
    content: string
    githubUsername: string
    timestamp: number
    id: string
    offsets: Selection
    source: AnnotationBodySources
}

interface Props {
    vscode: any
    notifyDone: () => void
    username: string
    userId: string
    annotations: Annotation[]
}

const getStartOffset = (a: AnnotationBodyLocationMetaData): number => {
    return a.offsets.startOffset
    // Array.isArray(a.offsets)
    //     ? a.offsets[0].startOffset
    // :
}

const getEndOffset = (a: AnnotationBodyLocationMetaData): number => {
    return a.offsets.endOffset
    // Array.isArray(a.offsets)
    //     ? a.offsets[a.offsets.length - 1].endOffset
    //     :
}

const getInternalOffsets = (a: AnnotationBodyLocationMetaData): Selection => {
    return a.offsets
    // Array.isArray(a.offsets)
    //     ? { startOffset: getStartOffset(a), endOffset: getEndOffset(a) }
    //     :
}

const isUserAddedText = (obj: any): obj is UserAddedText => {
    return obj.source === AnnotationBodySources.User
}

const isSelection = (obj: any): obj is Selection => {
    return obj.hasOwnProperty('startOffset') && obj.hasOwnProperty('endOffset')
}

const offsetsAreEqual = (off1: Selection, off2: Selection): boolean => {
    return (
        off1.endOffset === off2.endOffset &&
        off1.startOffset === off2.startOffset
    )
}

const MergeAnnotations: React.FC<Props> = ({
    vscode,
    username,
    userId,
    notifyDone = () => {},
    annotations = [],
}) => {
    const [newAnnotation, _setNewAnnotation] = React.useState<Annotation>(
        buildAnnotation({ ...buildEmptyAnnotation(), id: 'temp-merge' })
    )

    const newAnnotationRef = React.useRef(newAnnotation) // have to use the useRef hook to access the most up-to-date state value in our 'receiveAnchors' listener handler
    const setNewAnnotation = (newAnno: Annotation) => {
        newAnnotationRef.current = newAnno
        _setNewAnnotation(newAnno)
    }
    const [annotationsActuallyMerged, setAnnotationsActuallyMerged] =
        React.useState<Map<string, MergeInformation>>(new Map())
    const [duplicateBundles, setDuplicateBundles] = React.useState<DB>(null)
    const [getAllAnnotation, setGetAllAnnotation] =
        React.useState<boolean>(false)
    const [getAllReplies, setGetAllReplies] = React.useState<boolean>(false)
    const [types, setTypes] = React.useState<Type[]>([])
    const [replies, setReplies] = React.useState<Reply[]>([])
    const [
        internalAnnotationBodyRepresentation,
        _setInternalAnnotationBodyRepresentation,
    ] = React.useState<AnnotationBodyLocationMetaData[]>([])
    const [githubUsername, setGithubUsername] = React.useState<string>(username)

    React.useEffect(() => {
        setGithubUsername(username)
    }, [username])

    const printInternalAnnotationBodyRepresentation = (): string => {
        const newList = internalAnnotationBodyRepresentation.sort((a, b) => {
            const aOffset = getStartOffset(a)
            const bOffset = getStartOffset(b)
            return aOffset - bOffset
        })

        const arrToPrint = newList
            .map((i) => {
                return {
                    content: i.content,
                    startOffset: i.offsets.startOffset,
                }
            })
            .flat()
            .sort((a, b) => a.startOffset - b.startOffset)

        return arrToPrint.map((a) => a.content).join('')
    }

    const prettyPrintInternalAnnotationBodyRepresentation = (): string => {
        const newList = internalAnnotationBodyRepresentation.sort((a, b) => {
            const aOffset = getStartOffset(a)
            const bOffset = getStartOffset(b)
            return aOffset - bOffset
        })

        const arrToPrint = newList
            .map((i) => {
                return {
                    content: i.content,
                    startOffset: i.offsets.startOffset,
                }
            })
            .flat()
            .sort((a, b) => a.startOffset - b.startOffset)

        return arrToPrint.map((a) => a.content).join('\n\t')
    }

    const addNumberToOffset = (offsets: Selection, val: number): Selection => {
        return {
            startOffset: offsets.startOffset + val,
            endOffset: offsets.endOffset + val,
        }
    }

    // reset 0th index to beginning of textarea
    // ensure subsequent offsets are inline with 0th
    // check that the length of the text matches the offsets
    const auditInternal = (
        newInternal: AnnotationBodyLocationMetaData[]
    ): AnnotationBodyLocationMetaData[] => {
        let charDiff = 0
        let audited = []
        let auditedIdx = 0
        newInternal.forEach((internal, i) => {
            let auditedInternal = { ...internal }
            if (
                auditedInternal.offsets.startOffset ===
                    auditedInternal.offsets.endOffset ||
                auditedInternal.content.length === 0
            ) {
                // dont push empty selections
                // ideally wouldnt have empty selections at all but whatever
                return
            }
            // make sure we are flush with beginning of textarea
            if (i === 0) {
                const startOffsetIsZero = getStartOffset(auditedInternal) === 0
                if (!startOffsetIsZero) {
                    charDiff -= getStartOffset(auditedInternal)
                    auditedInternal = {
                        ...auditedInternal,
                        offsets: addNumberToOffset(
                            auditedInternal.offsets,
                            charDiff
                        ),
                    }
                }
            } else {
                if (auditedIdx > 0) {
                    const isStartOffsetFlushWithLastEndOffset =
                        audited[auditedIdx - 1].offsets.endOffset ===
                        internal.offsets.startOffset // offsets are not inclusive
                    if (!isStartOffsetFlushWithLastEndOffset) {
                        auditedInternal = {
                            ...auditedInternal,
                            offsets: {
                                startOffset:
                                    audited[auditedIdx - 1].offsets.endOffset,
                                endOffset:
                                    audited[auditedIdx - 1].offsets.endOffset +
                                    auditedInternal.content.length,
                            },
                        }
                    }
                } else if (auditedIdx === 0) {
                    auditedInternal = {
                        ...auditedInternal,
                        offsets: {
                            startOffset: 0,
                            endOffset: auditedInternal.content.length,
                        },
                    }
                }
            }
            const isLenOfContentSameAsOffsetDiff =
                checkOffsetsEqualTextLength(auditedInternal)
            if (!isLenOfContentSameAsOffsetDiff) {
                auditedInternal = {
                    ...auditedInternal,
                    offsets: {
                        startOffset: auditedInternal.offsets.startOffset,
                        endOffset:
                            auditedInternal.offsets.startOffset +
                            auditedInternal.content.length,
                    },
                }
            }
            auditedIdx++
            audited.push(auditedInternal)
        })
        return audited
    }

    const checkOffsetsEqualTextLength = (
        auditedInternal: AnnotationBodyLocationMetaData
    ): boolean => {
        return (
            auditedInternal.content.length ===
            auditedInternal.offsets.endOffset -
                auditedInternal.offsets.startOffset
        )
    }

    const setInternalAnnotationBodyRepresentation = (
        newInternalAnnotationBodyRepresentation: AnnotationBodyLocationMetaData[]
    ): void => {
        const newList = auditInternal(
            newInternalAnnotationBodyRepresentation.sort((a, b) => {
                const aOffset = getStartOffset(a)
                const bOffset = getStartOffset(b)
                return aOffset - bOffset
            })
        )

        const currAnnoIds = newList.map((a) => a.annoId)
        const currReplyIds = newList
            .map((a) => a.replyId)
            .filter((a) => a !== undefined)
        let replyInfo = []
        let annoInfo = ''
        annotations.forEach((anno) => {
            if (currAnnoIds.includes(anno.id)) {
                if (currReplyIds.length) {
                    const replyIds = anno.replies.map((r) => r.id)
                    if (replyIds.some((r) => currReplyIds.includes(r))) {
                        const matchingReplies = anno.replies.filter((r) =>
                            currReplyIds.includes(r.id)
                        )
                        replyInfo = matchingReplies.map((r) => {
                            return { ...r, inAnnoBody: true, annoId: anno.id }
                        })
                    }
                }

                const isMatchingAnnotationText = newList.find(
                    (i) => i.annoId === anno.id && !i.replyId
                )
                if (isMatchingAnnotationText) {
                    annoInfo = isMatchingAnnotationText.content
                }
            }
            setAnnotationsActuallyMerged(
                new Map(
                    annotationsActuallyMerged.set(anno.id, {
                        ...annotationsActuallyMerged.get(anno.id),
                        annotation: annoInfo,
                        replies: replyInfo,
                    })
                )
            )
            annoInfo = ''
            replyInfo = []
        })
        _setInternalAnnotationBodyRepresentation(newList)
    }

    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
            },
            background: {
                paper: `${editorBackground}`,
            },
        },
        typography: {
            allVariants: {
                fontSize: 14,
                color: `${vscodeTextColor}`,
                fontFamily: 'Arial',
            },
        },
        components: {
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        backgroundColor: editorBackground,
                        color: iconColor,
                    },
                },
            },
            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        color: `${vscodeTextColor} !important`,
                        '&.Mui-checked': {
                            color: `${vscodeTextColor}`,
                        },
                    },
                },
            },
        },
        breakpoints: breakpoints,
    })

    React.useEffect(() => {
        window.addEventListener('message', handleIncomingMessages)
        return () => {
            window.removeEventListener('message', handleIncomingMessages)
        }
    }, [])

    React.useEffect(() => {
        vscode.postMessage({
            command: 'findMatchingAnchors',
            annotations,
        })
        // consider initing map here
    }, [annotations])

    const handleIncomingMessages = (e: MessageEvent<any>): void => {
        const message = e.data
        switch (message.command) {
            case 'receiveAnchors': {
                const { anchors, removedAnchorIds, usedAnnoIds } =
                    message.payload

                const anchorsToSet =
                    newAnnotationRef.current.anchors.concat(anchors)

                const newAnno = buildAnnotation({
                    ...newAnnotation,
                    anchors: anchorsToSet,
                })

                setNewAnnotation(newAnno)

                if (removedAnchorIds.length || usedAnnoIds.length) {
                    let db: DB = {}
                    usedAnnoIds.forEach((annoId: string) => {
                        const usedAnchorIdsThatMatchThisAnno: AnchorInformation[] =
                            anchors
                                .filter((a) => a.parentId === annoId)
                                .map((a: AnchorObject) => {
                                    const dupPairs = removedAnchorIds.flatMap(
                                        (r) => {
                                            const anchorIds = r.duplicateOf.map(
                                                (ra) => ra.anchorId
                                            )
                                            const annoIds = r.duplicateOf.map(
                                                (ra) => ra.annoId
                                            )
                                            return {
                                                anchorIds,
                                                annoIds,
                                                dupAnchorId: r.anchorId,
                                                dupAnnoId: r.annoId,
                                            }
                                        }
                                    )
                                    const hasDups = dupPairs
                                        .filter(
                                            (h) =>
                                                h.anchorIds.includes(
                                                    a.anchorId
                                                ) &&
                                                h.annoIds.includes(a.parentId)
                                        )
                                        .map((h) => {
                                            return {
                                                anchorId: h.dupAnchorId,
                                                annoId: h.dupAnnoId,
                                            }
                                        })

                                    if (hasDups.length) {
                                        db = {
                                            ...db,
                                            [a.anchorText]: {
                                                annoIds: hasDups
                                                    .map((d) => d.annoId)
                                                    .concat(a.parentId),
                                                anchorIds: hasDups
                                                    .map((d) => d.anchorId)
                                                    .concat(a.anchorId),
                                            },
                                        }
                                    }

                                    return {
                                        anchorId: a.anchorId,
                                        duplicateOf: [],
                                        hasDuplicates: hasDups,
                                    }
                                })
                        const anchorIdsForAnnoId: AnchorInformation[] =
                            removedAnchorIds
                                .filter((a) => a.annoId === annoId)
                                .map((a) => {
                                    return {
                                        anchorId: a.anchorId,
                                        duplicateOf: a.duplicateOf,
                                        hasDuplicates: [],
                                    }
                                })
                                .concat(usedAnchorIdsThatMatchThisAnno)
                        setAnnotationsActuallyMerged(
                            new Map(
                                annotationsActuallyMerged.set(annoId, {
                                    ...annotationsActuallyMerged.get(annoId),
                                    anchors: anchorIdsForAnnoId,
                                })
                            )
                        )
                    })
                    setDuplicateBundles(db)
                }
            }
        }
    }

    const cancelAnnotation = () => {
        notifyDone()
        vscode.postMessage({
            command: 'cancelAnnotation',
        })
    }

    const mergeAnnotations = (
        annoContent: string,
        shareWith: string | undefined,
        willBePinned: boolean | undefined
    ) => {
        notifyDone()
        const annoToPass = buildAnnotation({
            ...newAnnotation,
            annotation: prettyPrintInternalAnnotationBodyRepresentation(),
            shareWith,
            selected: willBePinned,
        })

        vscode.postMessage({
            command: 'mergeAnnotation',
            anno: annoToPass,
            mergedAnnotations: Object.fromEntries(annotationsActuallyMerged),
        })
    }

    const updateAnnotationTypes = (newTypes: Type[]): void => {
        setTypes(newTypes)
    }

    const addAnchor = (): void => {
        vscode.postMessage({
            command: 'addAnchor',
            annoId: newAnnotation.id,
        })
    }

    const deleteReply = (id: string): void => {
        const updatedReply = {
            ...replies.filter((r) => r.id === id)[0],
            deleted: true,
        }
        const updatedReplies = replies
            .filter((r) => r.id !== id)
            .concat([updatedReply])
        setReplies(updatedReplies)
    }

    const submitReply = (reply: Reply): void => {
        const replyIds: string[] = replies.map((r) => r.id)
        const updatedReplies: Reply[] = replyIds.includes(reply.id)
            ? replies.filter((r) => r.id !== reply.id).concat([reply])
            : replies.concat([reply])
        setReplies(updatedReplies)
    }

    const handleUserAddedAnnotationContent = (
        newTextAreaValue: string,
        userText: string,
        selectedRange?: Selection
    ) => {
        const userContent: UserAddedText = {
            content: userText,
            githubUsername: githubUsername ?? '',
            timestamp: new Date().getTime(),
            id: githubUsername
                ? githubUsername + new Date().getTime()
                : '-' + new Date().getTime(),
            offsets: selectedRange ?? { startOffset: 0, endOffset: 0 },
            source: AnnotationBodySources.User,
        }
        userText.length
            ? updateInternalRepresentation('userAddedText', userContent)
            : updateInternalRepresentation('userRemovedText', userContent)
    }

    const updateOffsets = (
        sel: Selection,
        sortedList: AnnotationBodyLocationMetaData[],
        operation: string = 'adding'
    ): AnnotationBodyLocationMetaData[] => {
        if (!sortedList.length) {
            return []
        }
        const firstIndexToMove = sortedList.findIndex(
            (s) => s.offsets.endOffset === sel.startOffset
        )
        const len = sel.endOffset - sel.startOffset
        if (firstIndexToMove !== -1) {
            const updated = sortedList.map((b, i) => {
                if (i < firstIndexToMove || getEndOffset(b) <= sel.startOffset)
                    return b

                return {
                    ...b,
                    offsets: {
                        startOffset:
                            operation === 'removing'
                                ? b.offsets.startOffset - len
                                : b.offsets.startOffset + len,
                        endOffset:
                            operation === 'removing'
                                ? b.offsets.endOffset - len
                                : b.offsets.endOffset + len,
                    },
                }
            })
            return updated
        }
        // probably added to beginning of list
        else {
            const updated = sortedList.map((b) => {
                return {
                    ...b,
                    offsets: {
                        startOffset:
                            operation === 'removing'
                                ? b.offsets.startOffset - len
                                : b.offsets.startOffset + len,
                        endOffset:
                            operation === 'removing'
                                ? b.offsets.endOffset - len
                                : b.offsets.endOffset + len,
                    },
                }
            })
            return updated
        }
    }

    const getOffsets = (
        representationToChange: AnnotationBodyMetaData,
        typeOfChange: string,
        currList?: AnnotationBodyLocationMetaData[]
    ): Selection => {
        const sortedList = currList
            ? currList.sort((a, b) => b.timestamp - a.timestamp)
            : internalAnnotationBodyRepresentation.sort(
                  (a, b) => b.timestamp - a.timestamp
              )
        switch (typeOfChange) {
            case 'addAnnotation': {
                // const repToAddAfter = representationToChange.hasOwnProperty('replyId') ?
                // to do -- figure out how to get start and end offsets

                const indexToInsert = sortedList.findIndex(
                    (b) => representationToChange.timestamp > b.timestamp
                )
                if (indexToInsert !== -1) {
                    const startOffset =
                        indexToInsert !== 0
                            ? getEndOffset(sortedList[indexToInsert - 1])
                            : 0 // we either start the annotation at the end of the last index, or start it at the beginning
                    const endOffset =
                        startOffset + representationToChange.content.length
                    const sel = { startOffset, endOffset }
                    return sel
                } else {
                    const startOffset = sortedList.length
                        ? getEndOffset(sortedList[sortedList.length - 1])
                        : 0
                    const endOffset =
                        startOffset + representationToChange.content.length
                    return { startOffset, endOffset }
                }
            }
            case 'addReply': {
                const annoToUpdate = internalAnnotationBodyRepresentation.find(
                    (a) => a.annoId === representationToChange.annoId
                )
                if (!annoToUpdate) {
                    // determine whether annotation was either partitioned or has not been added yet
                    const partitionedAnno =
                        internalAnnotationBodyRepresentation.find((a) =>
                            a.annoId.includes(representationToChange.annoId)
                        )
                    // add to partition -- would be better to see whether there is a reply we can append after
                    if (partitionedAnno) {
                        const idx =
                            internalAnnotationBodyRepresentation.findIndex(
                                (a) =>
                                    a.annoId.includes(
                                        representationToChange.annoId
                                    )
                            )
                        const startOffset = sortedList.length
                            ? getEndOffset(sortedList[idx])
                            : 0
                        const endOffset =
                            startOffset + representationToChange.content.length
                        return { startOffset, endOffset }
                    }
                }
                // append to the end
                // else
                const startOffset = sortedList.length
                    ? getEndOffset(sortedList[sortedList.length - 1])
                    : 0
                const endOffset =
                    startOffset + representationToChange.content.length
                return { startOffset, endOffset }
            }
        }
    }

    const createAnnotationInternalRepresentation = (
        anno: Annotation,
        currList?: AnnotationBodyLocationMetaData[]
    ): AnnotationBodyLocationMetaData => {
        const baseInternal: AnnotationBodyMetaData = {
            source: AnnotationBodySources.Annotation,
            annoId: anno.id,
            timestamp:
                anno.lastEditTime && anno.lastEditTime > anno.createdTimestamp
                    ? anno.lastEditTime
                    : anno.createdTimestamp,
            content: anno.annotation,
            githubUsername: anno.githubUsername,
        }

        const offsets = currList
            ? getOffsets(baseInternal, 'addAnnotation', currList)
            : getOffsets(baseInternal, 'addAnnotation')

        const internalRepresentation: AnnotationBodyLocationMetaData = {
            ...baseInternal,
            offsets: {
                startOffset: offsets.startOffset,
                endOffset: offsets.endOffset,
            },
        }

        return internalRepresentation
    }

    const updateInternalRepresentation = (typeOfChange: string, obj: any) => {
        switch (typeOfChange) {
            case 'addAnnotation': {
                const internalRepresentation =
                    createAnnotationInternalRepresentation(obj as Annotation)
                const updatedList = updateOffsets(
                    getInternalOffsets(internalRepresentation),
                    internalAnnotationBodyRepresentation.sort(
                        (a, b) => a.timestamp - b.timestamp
                    )
                )
                setInternalAnnotationBodyRepresentation(
                    updatedList.concat(internalRepresentation)
                )
                break
            }
            case 'removeAnnotation': {
                const internalRepresentation =
                    internalAnnotationBodyRepresentation.find(
                        (i) => i.annoId === obj.id
                    )
                const updatedList = updateOffsets(
                    getInternalOffsets(internalRepresentation),
                    internalAnnotationBodyRepresentation.sort(
                        (a, b) => a.timestamp - b.timestamp
                    ),
                    'removing'
                )
                setInternalAnnotationBodyRepresentation(
                    updatedList.filter(
                        (i) => i.annoId !== internalRepresentation.annoId
                    )
                )
                break
            }
            case 'addReply': {
                const reply: ReplyMergeInformation =
                    obj as ReplyMergeInformation
                const baseInternal: AnnotationBodyMetaData = {
                    source: AnnotationBodySources.Reply,
                    annoId: reply.annoId,
                    timestamp:
                        reply.lastEditTime &&
                        reply.lastEditTime > reply.createdTimestamp
                            ? reply.lastEditTime
                            : reply.createdTimestamp,
                    content: reply.replyContent,
                    githubUsername: reply.githubUsername,
                    replyId: reply.id,
                }
                const replyOffsets: Selection = getOffsets(
                    baseInternal,
                    typeOfChange
                )

                const newReply: AnnotationBodyLocationMetaData = {
                    ...baseInternal,
                    offsets: {
                        startOffset: replyOffsets.startOffset,
                        endOffset: replyOffsets.endOffset,
                    },
                }
                const updatedList = updateOffsets(
                    getInternalOffsets(newReply),
                    internalAnnotationBodyRepresentation.sort(
                        (a, b) => a.timestamp - b.timestamp
                    )
                )
                setInternalAnnotationBodyRepresentation(
                    updatedList.concat(newReply)
                )

                break
            }
            case 'removeReply': {
                const replyToRemove = internalAnnotationBodyRepresentation.find(
                    (i) => i.replyId && i.replyId === obj.id
                )
                const updatedList = updateOffsets(
                    getInternalOffsets(replyToRemove),
                    internalAnnotationBodyRepresentation.sort(
                        (a, b) => a.timestamp - b.timestamp
                    ),
                    'removing'
                )
                setInternalAnnotationBodyRepresentation(
                    updatedList.filter((i) => i.replyId !== obj.id)
                )
                break
            }
            case 'userAddedText': {
                const userAddition: UserAddedText = obj as UserAddedText
                const surroundingMetadata: SurroundingMetadata =
                    internalAnnotationBodyRepresentation.length
                        ? findSurroundingAnnotationBodyMetaData(userAddition)
                        : null
                let baseInternal = null
                let partitionA = null
                let partitionB = null
                let didPartition = false
                let didAddToText = false
                if (
                    surroundingMetadata &&
                    surroundingMetadata.otherInformation &&
                    surroundingMetadata.otherInformation.addingToUserText
                ) {
                    const objWereAddingTo =
                        internalAnnotationBodyRepresentation[
                            surroundingMetadata.index
                        ]
                    didAddToText = true
                    baseInternal = {
                        ...objWereAddingTo,
                        offsets: {
                            startOffset:
                                surroundingMetadata.insertionType ===
                                InsertionType.Before
                                    ? userAddition.offsets.startOffset
                                    : getStartOffset(objWereAddingTo),
                            endOffset:
                                getEndOffset(objWereAddingTo) +
                                userAddition.content.length,
                        },
                        content: mergeContentStrings(
                            objWereAddingTo,
                            userAddition,
                            surroundingMetadata
                        ),
                    }
                } else {
                    baseInternal = {
                        source: AnnotationBodySources.User,
                        annoId: userAddition.id,
                        timestamp: userAddition.timestamp,
                        content: userAddition.content,
                        githubUsername: userAddition.githubUsername,
                        offsets: {
                            startOffset: userAddition.offsets.startOffset,
                            endOffset: userAddition.offsets.endOffset,
                        },
                    }
                    if (
                        surroundingMetadata &&
                        surroundingMetadata.insertionType ===
                            InsertionType.Inside
                    ) {
                        didPartition = true
                        const objWerePartitioning =
                            internalAnnotationBodyRepresentation[
                                surroundingMetadata.index
                            ]

                        const offsetWhichContainsUserAddition =
                            objWerePartitioning.offsets
                        const partitionedOffsets = [
                            {
                                startOffset:
                                    offsetWhichContainsUserAddition.startOffset,
                                endOffset: userAddition.offsets.startOffset,
                            },
                            {
                                startOffset: userAddition.offsets.endOffset,
                                endOffset:
                                    offsetWhichContainsUserAddition.endOffset,
                            },
                        ]

                        partitionA = {
                            ...objWerePartitioning,
                            annoId: objWerePartitioning.annoId,
                            //  not sure if we need unique IDs for this -- bring back if we decide we do need that for whatever reason
                            offsets: partitionedOffsets[0],
                            content: objWerePartitioning.content.substring(
                                0,
                                partitionedOffsets[0].endOffset -
                                    partitionedOffsets[0].startOffset
                            ),
                        }
                        partitionB = {
                            ...objWerePartitioning,
                            annoId: objWerePartitioning.annoId,
                            offsets: partitionedOffsets[1],
                            content: objWerePartitioning.content.substring(
                                partitionedOffsets[1].startOffset -
                                    userAddition.content.length -
                                    partitionedOffsets[0].startOffset,
                                partitionedOffsets[1].endOffset -
                                    partitionedOffsets[0].startOffset
                            ),
                        }
                    }
                }

                let updatedList = updateOffsets(
                    baseInternal.offsets,
                    internalAnnotationBodyRepresentation
                )
                if (didPartition) {
                    updatedList = internalAnnotationBodyRepresentation
                        .map((internal, i) =>
                            surroundingMetadata.index === i
                                ? partitionA
                                : internal
                        )
                        .concat(partitionB)
                }

                if (didAddToText) {
                    updatedList = updatedList.map((internal, i) =>
                        surroundingMetadata.index === i
                            ? baseInternal
                            : internal
                    )
                }

                setInternalAnnotationBodyRepresentation(
                    didAddToText
                        ? updatedList
                        : updatedList.concat(baseInternal)
                )
                break
            }
            case 'userRemovedText': {
                const removal = obj as UserAddedText
                const deletionLen =
                    removal.offsets.endOffset - removal.offsets.startOffset
                const intersections = internalAnnotationBodyRepresentation
                    .map((a, i) => {
                        return {
                            ...a,
                            i,
                            deletionType: getDeletionType(a, removal.offsets),
                        }
                    })
                    .filter(
                        (a) => a.deletionType !== DeletionType.DeletionContains
                    )

                const newList = intersections.map((a) => {
                    const position =
                        removal.offsets.startOffset - a.offsets.startOffset
                    switch (a.deletionType) {
                        case DeletionType.ContainsDeletion: {
                            return {
                                ...a,
                                offsets: {
                                    startOffset: a.offsets.startOffset,
                                    endOffset:
                                        a.offsets.endOffset - deletionLen,
                                },
                                content:
                                    a.content.substring(0, position) +
                                    a.content.substring(position + deletionLen),
                            }
                        }
                        case DeletionType.DeletionStarts: {
                            return {
                                ...a,
                                offsets: {
                                    startOffset: a.offsets.startOffset,
                                    endOffset: removal.offsets.startOffset,
                                },
                                content: a.content.substring(0, position),
                            }
                        }
                        case DeletionType.DeletionEnds: {
                            return {
                                ...a,
                                offsets: {
                                    startOffset:
                                        removal.offsets.endOffset - deletionLen,
                                    endOffset:
                                        a.offsets.endOffset - deletionLen,
                                },
                                content: a.content.substring(
                                    position + deletionLen
                                ),
                            }
                        }
                        case DeletionType.AfterDeletion: {
                            return {
                                ...a,
                                offsets: {
                                    startOffset:
                                        a.offsets.startOffset - deletionLen,
                                    endOffset:
                                        a.offsets.endOffset - deletionLen,
                                },
                            }
                        }
                        case DeletionType.NoRelation: {
                            return a
                        }
                    }
                })
                updateInternalRepresentationGithubUsernames(newList)
                setInternalAnnotationBodyRepresentation(newList)
                break
            }
            case 'githubUsernames': {
                updateInternalRepresentationGithubUsernames()
                break
            }
        }
    }

    const mergeContentStrings = (
        objWereModifying: AnnotationBodyLocationMetaData,
        userAddition: UserAddedText,
        surroundingMetadata: SurroundingMetadata
    ): string => {
        let str = ''
        switch (surroundingMetadata.insertionType) {
            case InsertionType.Before: {
                str = userAddition.content + objWereModifying.content
                break
            }
            case InsertionType.Inside: {
                const position =
                    userAddition.offsets.startOffset -
                    objWereModifying.offsets.startOffset
                str =
                    objWereModifying.content.substring(0, position) +
                    userAddition.content +
                    objWereModifying.content.substring(position)
                break
            }
            case InsertionType.After: {
                str = objWereModifying.content + userAddition.content
                break
            }
        }
        return str
    }

    const getAllReplyContent = (): void => {
        let replies: ReplyMergeInformation[] = []
        annotations.forEach((a) => {
            if (a.replies.length) {
                replies = replies.concat(
                    a.replies.map((r) => {
                        return { ...r, inAnnoBody: true, annoId: a.id }
                    })
                )
            }
        })
        const newList = replies.reduce(
            (
                prevValue: AnnotationBodyLocationMetaData[],
                currReply: ReplyMergeInformation
            ) => {
                const baseInternal: AnnotationBodyMetaData = {
                    source: AnnotationBodySources.Reply,
                    annoId: currReply.annoId,
                    timestamp:
                        currReply.lastEditTime &&
                        currReply.lastEditTime > currReply.createdTimestamp
                            ? currReply.lastEditTime
                            : currReply.createdTimestamp,
                    content: currReply.replyContent,
                    githubUsername: currReply.githubUsername,
                    replyId: currReply.id,
                }
                const replyOffsets: Selection = getOffsets(
                    baseInternal,
                    'addReply',
                    prevValue
                )

                const newReply: AnnotationBodyLocationMetaData = {
                    ...baseInternal,
                    offsets: {
                        startOffset: replyOffsets.startOffset,
                        endOffset: replyOffsets.endOffset,
                    },
                }
                const updatedList = updateOffsets(
                    getInternalOffsets(newReply),
                    prevValue.sort((a, b) => a.timestamp - b.timestamp)
                )
                return updatedList.concat(newReply)
            },
            internalAnnotationBodyRepresentation
        )

        updateInternalRepresentationGithubUsernames(newList)
        setGetAllReplies(true)
    }

    const removeAllReplyContent = (): void => {
        const newList = internalAnnotationBodyRepresentation.filter(
            (i) => i.source !== AnnotationBodySources.Reply
        )
        updateInternalRepresentationGithubUsernames(newList, true) // this will also set
        setGetAllReplies(false)
    }

    const updateInternalRepresentationGithubUsernames = (
        // list: string,
        internalRepresentationList?: AnnotationBodyLocationMetaData[],
        resetList?: boolean
    ): void => {
        const usernameList =
            resetList && internalRepresentationList
                ? [
                      ...new Set([
                          ...internalRepresentationList
                              .filter(
                                  (a) =>
                                      a.githubUsername.length > 0 &&
                                      a.source !==
                                          AnnotationBodySources.AuthorNameList
                              )
                              .map((i) => i.githubUsername),
                      ]),
                  ]
                : internalRepresentationList
                ? [
                      ...new Set([
                          ...internalAnnotationBodyRepresentation
                              .filter(
                                  (a) =>
                                      a.githubUsername.length > 0 &&
                                      a.source !==
                                          AnnotationBodySources.AuthorNameList
                              )
                              .map((i) => i.githubUsername),
                          ...internalRepresentationList
                              .filter(
                                  (a) =>
                                      a.githubUsername.length > 0 &&
                                      a.source !==
                                          AnnotationBodySources.AuthorNameList
                              )
                              .map((i) => i.githubUsername),
                      ]),
                  ]
                : [
                      ...new Set([
                          ...internalAnnotationBodyRepresentation
                              .filter(
                                  (a) =>
                                      a.githubUsername.length > 0 &&
                                      a.source !==
                                          AnnotationBodySources.AuthorNameList
                              )
                              .map((i) => i.githubUsername),
                      ]),
                  ]

        const list = generateList(usernameList)
        // const list = obj
        const internalRepresentation = internalRepresentationList
            ? internalRepresentationList.filter(
                  (i) => i.source !== AnnotationBodySources.AuthorNameList
              )
            : internalAnnotationBodyRepresentation.filter(
                  (i) => i.source !== AnnotationBodySources.AuthorNameList
              )
        if (!list.length) {
            setInternalAnnotationBodyRepresentation(internalRepresentation)
            return
        }

        const itemToAppendTo = internalRepresentation.sort(
            (a, b) => getEndOffset(b) - getEndOffset(a)
        )[0]
        const newGithubUsername: AnnotationBodyLocationMetaData = {
            source: AnnotationBodySources.AuthorNameList,
            offsets: {
                startOffset: itemToAppendTo ? getEndOffset(itemToAppendTo) : 0, // 1 for newline
                endOffset: itemToAppendTo
                    ? getEndOffset(itemToAppendTo) + list.length
                    : list.length,
            },
            annoId: 'github-usernames', // this field should probably just be id
            content: list,
            githubUsername: list,
            timestamp: new Date().getTime(),
        }
        setInternalAnnotationBodyRepresentation(
            internalRepresentation.concat(newGithubUsername)
        )
    }

    const getInsertionType = (
        matchingObject: AnnotationBodyLocationMetaData,
        sel: Selection
    ): InsertionType => {
        const off = matchingObject.offsets
        if (off.startOffset === sel.endOffset) {
            return InsertionType.Before
        } else if (off.endOffset === sel.startOffset) {
            return InsertionType.After
        } else if (
            off.startOffset <= sel.startOffset &&
            off.endOffset >= sel.endOffset
        ) {
            return InsertionType.Inside
        }
    }

    const inRange = (sel: Selection, num: number): boolean => {
        return sel.startOffset <= num && num <= sel.endOffset
    }

    const getDeletionType = (
        internal: AnnotationBodyLocationMetaData,
        offset: Selection
    ): DeletionType => {
        if (
            offset.startOffset < internal.offsets.startOffset &&
            offset.endOffset > internal.offsets.endOffset
        ) {
            return DeletionType.DeletionContains
        } else if (
            inRange(internal.offsets, offset.startOffset) &&
            inRange(internal.offsets, offset.endOffset)
        ) {
            return DeletionType.ContainsDeletion
        } else if (inRange(internal.offsets, offset.startOffset)) {
            return DeletionType.DeletionStarts
        } else if (inRange(internal.offsets, offset.endOffset)) {
            return DeletionType.DeletionEnds
        } else if (internal.offsets.startOffset >= offset.endOffset) {
            return DeletionType.AfterDeletion
        } else {
            return DeletionType.NoRelation
        }
    }

    const findSurroundingAnnotationBodyMetaData = (
        userAddition: UserAddedText
    ): SurroundingMetadata => {
        let surroundingMetadata: SurroundingMetadata = null
        let insertionType: InsertionType = null
        let otherInformation = null

        const isMatchingOtherUserText = internalAnnotationBodyRepresentation
            .map((a, i) => {
                return {
                    ...a,
                    index: i,
                }
            })
            .find((m) => {
                const startOffset = getStartOffset(m)
                const endOffset = getEndOffset(m)
                return (
                    isUserAddedText(m) &&
                    (startOffset === userAddition.offsets.endOffset ||
                        endOffset === userAddition.offsets.startOffset ||
                        (startOffset <= userAddition.offsets.startOffset &&
                            endOffset >= userAddition.offsets.endOffset))
                )
            })

        if (isMatchingOtherUserText) {
            otherInformation = {
                addingToUserText: true,
                id: isMatchingOtherUserText.annoId,
                partitioningThisTypeOfObject: AnnotationBodySources.User,
            }
            surroundingMetadata = {
                insertionType: getInsertionType(
                    isMatchingOtherUserText,
                    userAddition.offsets
                ),
                otherInformation,
                index: isMatchingOtherUserText.index,
            }

            return surroundingMetadata
        }

        const objs = internalAnnotationBodyRepresentation
            .map((a, i) => {
                return {
                    ...a,
                    index: i,
                }
            })
            .filter((m) => {
                const startOffset = getStartOffset(m)
                const endOffset = getEndOffset(m)
                return (
                    startOffset < userAddition.offsets.startOffset &&
                    endOffset > userAddition.offsets.endOffset
                )
            })

        if (objs.length) {
            insertionType = InsertionType.Inside
            let obj
            if (objs.length > 1) {
                objs.sort((a) => {
                    const startOffset = getStartOffset(a)
                    return startOffset - userAddition.offsets.startOffset
                })
            }
            obj = objs[0]

            if (isUserAddedText(obj)) {
                otherInformation = {
                    addingToUserText: true,
                    id: obj.id,
                    partitioningThisTypeOfObject: AnnotationBodySources.User,
                }
            } else {
                otherInformation = {
                    partitioningThisTypeOfObject: obj.source,
                    id: obj.annoId,
                }
            }
            surroundingMetadata = {
                insertionType,
                otherInformation,
                index: obj.index,
            }
            return surroundingMetadata
        } else {
            const obj = internalAnnotationBodyRepresentation
                .map((a, i) => {
                    return { ...a, index: i }
                })
                .find((a) => {
                    const startOffset = getStartOffset(a)
                    const endOffset = getEndOffset(a)
                    return (
                        startOffset === userAddition.offsets.endOffset ||
                        endOffset === userAddition.offsets.startOffset
                    )
                })
            if (obj) {
                if (isUserAddedText(obj)) {
                    otherInformation = {
                        addingToUserText: true,
                        id: obj.id,
                        partitioningThisTypeOfObject:
                            AnnotationBodySources.User,
                    }
                }
                const startOffset = getStartOffset(obj)
                insertionType =
                    startOffset === userAddition.offsets.endOffset
                        ? InsertionType.Before
                        : InsertionType.After
                return isUserAddedText(obj)
                    ? { insertionType, index: obj.index, otherInformation }
                    : { insertionType, index: obj.index }
            } else {
                const maxOffset = Math.max(
                    ...internalAnnotationBodyRepresentation.map((r) =>
                        getEndOffset(r)
                    )
                )
                const minOffset = Math.min(
                    ...internalAnnotationBodyRepresentation.map((r) =>
                        getStartOffset(r)
                    )
                )
                if (userAddition.offsets.startOffset >= maxOffset) {
                    const itemIndex =
                        internalAnnotationBodyRepresentation.findIndex(
                            (r) => getEndOffset(r) === maxOffset
                        )
                    if (itemIndex !== -1) {
                        const item =
                            internalAnnotationBodyRepresentation[itemIndex]
                        if (isUserAddedText(item)) {
                            otherInformation = {
                                addingToUserText: true,
                                id: item.id,
                                partitioningThisTypeOfObject:
                                    AnnotationBodySources.User,
                            }
                            return {
                                insertionType: InsertionType.After,
                                index: itemIndex,
                                otherInformation,
                            }
                        } else {
                            return {
                                insertionType: InsertionType.After,
                                index: itemIndex,
                            }
                        }
                    } else {
                        return {
                            insertionType: InsertionType.Before,
                            index: 0,
                        }
                    }
                } else if (userAddition.offsets.endOffset <= minOffset) {
                    const itemIndex =
                        internalAnnotationBodyRepresentation.findIndex(
                            (r) => getStartOffset(r) === minOffset
                        )
                    if (itemIndex !== -1) {
                        const item =
                            internalAnnotationBodyRepresentation[itemIndex]
                        if (isUserAddedText(item)) {
                            otherInformation = {
                                addingToUserText: true,
                                id: item.id,
                                partitioningThisTypeOfObject:
                                    AnnotationBodySources.User,
                            }
                            return {
                                insertionType: InsertionType.Before,
                                index: itemIndex,
                                otherInformation,
                            }
                        } else {
                            return {
                                insertionType: InsertionType.Before,
                                index: itemIndex,
                            }
                        }
                    } else {
                        return {
                            insertionType: InsertionType.After,
                            index: 0,
                        }
                    }
                }
            }
        }
    }

    const removeAllAnnotationContent = (): void => {
        removeAllAnnotationMetadata()
        setGetAllAnnotation(false)
    }

    const getAllAnnotationMetadata = (): void => {
        const newList = annotations
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .reduce(
                (
                    prevValue: AnnotationBodyLocationMetaData[],
                    currAnno: Annotation
                ) => {
                    const newAnno = createAnnotationInternalRepresentation(
                        currAnno,
                        prevValue
                    )
                    const newList = updateOffsets(
                        getInternalOffsets(newAnno),
                        prevValue
                    )
                    return newList.concat(newAnno)
                },
                internalAnnotationBodyRepresentation
            )
        // console.log('im a reduce pro now', newList)
        const usernameList = [
            ...new Set([
                ...internalAnnotationBodyRepresentation
                    .filter(
                        (a) =>
                            a.githubUsername.length > 0 &&
                            a.source !== AnnotationBodySources.AuthorNameList
                    )
                    .map((i) => i.githubUsername),
                ...newList
                    .filter(
                        (a) =>
                            a.githubUsername.length > 0 &&
                            a.source !== AnnotationBodySources.AuthorNameList
                    )
                    .map((i) => i.githubUsername),
            ]),
        ]
        updateInternalRepresentationGithubUsernames(newList)
    }

    const removeAllAnnotationMetadata = (): void => {
        const newList = internalAnnotationBodyRepresentation.filter(
            (i) => i.source !== AnnotationBodySources.Annotation
        )
        setInternalAnnotationBodyRepresentation(newList)
    }

    const getAllAnnotationContent = (): void => {
        getAllAnnotationMetadata()
        setGetAllAnnotation(true)
    }

    const addAnnotationContent = (annoId: string) => {
        const newInternalRepresentation =
            createAnnotationInternalRepresentation(
                annotations.find((a) => a.id === annoId)
            )

        const newList = updateOffsets(
            getInternalOffsets(newInternalRepresentation),
            internalAnnotationBodyRepresentation
        ).concat(newInternalRepresentation)

        setInternalAnnotationBodyRepresentation(newList)
        updateInternalRepresentationGithubUsernames(newList)

        setAnnotationsActuallyMerged(
            new Map(
                annotationsActuallyMerged.set(annoId, {
                    ...annotationsActuallyMerged.get(annoId),
                    annotation: newInternalRepresentation.content.trim(),
                })
            )
        )
    }

    const removeAnnotationContent = (annoId: string) => {
        const updatedList = internalAnnotationBodyRepresentation.filter(
            (i) => !i.annoId.includes(annoId) || i.replyId
        )
        setInternalAnnotationBodyRepresentation(updatedList)
        updateInternalRepresentationGithubUsernames(updatedList)

        setAnnotationsActuallyMerged(
            new Map(
                annotationsActuallyMerged.set(annoId, {
                    ...annotationsActuallyMerged.get(annoId),
                    annotation: '',
                })
            )
        )
    }

    const handleUpdateAnnotationContent = (annoId: string) => {
        if (
            annotationsActuallyMerged.get(annoId).annotation === '' ||
            !annotationsActuallyMerged.get(annoId).annotation // map is empty/this anno hasnt been added
        ) {
            addAnnotationContent(annoId)
        } else {
            removeAnnotationContent(annoId)
        }
    }

    const handleUpdateAnchor = (object: any) => {
        let anchorId: string,
            annotationId: string,
            text: string,
            anchorText: string
        // this is stupid = could just have object always used AnchorObject property names
        if (isAnchorObject(object)) {
            anchorId = object.anchorId
            annotationId = object.parentId
            text = object.anchorText
            anchorText = object.anchorText
        } else {
            anchorId = object.anchorId
            annotationId = object.annotationId
            text = object.text
            anchorText = object.anchorText
        }

        const anchorToCopy = annotations
            .find((a) => a.id === annotationId)
            .anchors.find((a) => a.anchorId === anchorId)
        // console.log('newAnnotation', newAnnotation)
        setNewAnnotation(
            buildAnnotation({
                ...newAnnotation,
                anchors: newAnnotation.anchors.concat(anchorToCopy),
            })
        )

        if (duplicateBundles[text] || duplicateBundles[anchorText]) {
            // consider switching this to use our map instead of this separate obj
            duplicateBundles[anchorText].annoIds.forEach((annoId, i) => {
                const otherDups = duplicateBundles[anchorText].annoIds
                    .map((a, idx) => {
                        return (
                            idx !== i && {
                                annoId: a,
                                anchorId:
                                    duplicateBundles[anchorText].anchorIds[idx],
                            }
                        )
                    })
                    .filter((an) => typeof an !== 'boolean') // stupid
                setAnnotationsActuallyMerged(
                    new Map(
                        annotationsActuallyMerged.set(annoId, {
                            ...annotationsActuallyMerged.get(annoId),
                            anchors: annotationsActuallyMerged
                                .get(annoId)
                                .anchors.concat({
                                    anchorId:
                                        duplicateBundles[anchorText].anchorIds[
                                            i
                                        ],
                                    duplicateOf: [],
                                    hasDuplicates: otherDups,
                                }), // need to double check if this is true
                        })
                    )
                )
            })
        } else {
            setAnnotationsActuallyMerged(
                new Map(
                    annotationsActuallyMerged.set(annotationId, {
                        ...annotationsActuallyMerged.get(annotationId),
                        anchors: annotationsActuallyMerged
                            .get(annotationId)
                            .anchors.concat({
                                anchorId,
                                duplicateOf: [],
                                hasDuplicates: [],
                            }), // need to double check if this is true
                    })
                )
            )
        }
    }

    const handleUpdateReplies = (object: any) => {
        const { level, operation, annoId, ...rest } = object
        if (operation === 'remove') {
            const mergedReply = annotationsActuallyMerged
                .get(object.annoId)
                .replies.find((r) => r.id === object.id)
            if (mergedReply.inAnnoBody) {
                updateInternalRepresentation('removeReply', mergedReply)
                setAnnotationsActuallyMerged(
                    new Map(
                        annotationsActuallyMerged.set(annoId, {
                            ...annotationsActuallyMerged.get(annoId),
                            replies: annotationsActuallyMerged
                                .get(annoId)
                                .replies.filter((r) => r.id !== mergedReply.id),
                        })
                    )
                )
            } else if (
                annotationsActuallyMerged.get(object.annoId) &&
                annotationsActuallyMerged.get(object.annoId).replies &&
                annotationsActuallyMerged
                    .get(object.annoId)
                    .replies.map((r) => r.id)
                    .includes(object.id)
            ) {
                const newReplies = newAnnotation.replies.filter(
                    (r) => r.id !== object.id
                )
                setNewAnnotation(
                    buildAnnotation({
                        ...newAnnotation,
                        replies: newReplies,
                    })
                )
                setAnnotationsActuallyMerged(
                    new Map(
                        annotationsActuallyMerged.set(object.annoId, {
                            ...annotationsActuallyMerged.get(object.annoId),
                            replies: annotationsActuallyMerged
                                .get(object.annoId)
                                .replies.filter((r) => r.id !== object.id), // need to double check if this is true
                        })
                    )
                )
            }
        } else if (operation === 'add') {
            if (level === 'annotation') {
                updateInternalRepresentation('addReply', { annoId, ...rest })
                const replyToAdd = { ...rest, inAnnoBody: true }
                const mergedReplies =
                    annotationsActuallyMerged.get(annoId).replies

                setAnnotationsActuallyMerged(
                    new Map(
                        annotationsActuallyMerged.set(annoId, {
                            ...annotationsActuallyMerged.get(annoId),
                            replies: mergedReplies
                                ? mergedReplies.concat(replyToAdd)
                                : [replyToAdd],
                        })
                    )
                )
            } else {
                // const { annoId, ...rest } = object
                const newReplies = newAnnotation.replies.concat(rest)
                setNewAnnotation(
                    buildAnnotation({
                        ...newAnnotation,
                        replies: newReplies,
                    })
                )
                const mergedReplies =
                    annotationsActuallyMerged.get(annoId).replies
                setAnnotationsActuallyMerged(
                    new Map(
                        annotationsActuallyMerged.set(annoId, {
                            ...annotationsActuallyMerged.get(annoId),
                            replies:
                                mergedReplies && mergedReplies.length
                                    ? mergedReplies.concat(rest)
                                    : [rest], // need to double check if this is true
                        })
                    )
                )
            }
        }
    }

    const partSelected = (type: string, object: any) => {
        switch (type) {
            case 'annotation':
                handleUpdateAnnotationContent(object.annoId)
                break
            case 'anchor':
                handleUpdateAnchor(object)
                break
            case 'reply':
                handleUpdateReplies(object)
                break
        }
    }

    const generateList = (listOfAuthors: string[]): string => {
        return listOfAuthors.length
            ? '{' +
                  listOfAuthors
                      .map((u, i) =>
                          i !== listOfAuthors.length - 1 ? u + ', ' : u + '}'
                      )
                      .join('')
            : ''
    }

    // returns array of duplicate anchor Ids
    const checkMapForAnchorDuplicates = (
        annoId: string,
        anchorId: string
    ): AnnotationAnchorPair[] => {
        let dups = []
        annotationsActuallyMerged.forEach((val, key) => {
            if (key === annoId) {
                // if(val.anchors) {
                const ourAnchor = val.anchors.find(
                    (a) => a.anchorId === anchorId
                )
                if (ourAnchor) {
                    const hasDuplicates =
                        ourAnchor.hasDuplicates &&
                        ourAnchor.hasDuplicates.length > 0
                    hasDuplicates &&
                        ourAnchor.hasDuplicates.forEach((d) => dups.push(d))
                    const isDuplicate =
                        ourAnchor.duplicateOf &&
                        ourAnchor.duplicateOf.length > 0
                    isDuplicate &&
                        ourAnchor.duplicateOf.forEach((d) => dups.push(d))
                }
            } else {
                val.anchors.forEach((anch) => {
                    if (
                        anch.duplicateOf
                            .map((a) => a.anchorId)
                            .includes(anchorId)
                    ) {
                        anch.duplicateOf.forEach((d) => {
                            dups.push(d)
                        })
                        dups.push({ anchorId: anch.anchorId, annoId: key })
                    } else if (
                        anch.hasDuplicates
                            .map((a) => a.anchorId)
                            .includes(anchorId)
                    ) {
                        anch.hasDuplicates.forEach((d) => {
                            dups.push(d)
                        })
                        dups.push({ anchorId: anch.anchorId, annoId: key })
                    }
                })
            }
        })
        return dups
    }

    const removeAnchorFromMergeAnnotation = (
        anchorId: string,
        annoId: string
    ) => {
        const anchorsToRemove = [{ anchorId, annoId }].concat(
            checkMapForAnchorDuplicates(annoId, anchorId)
        )

        const ids = anchorsToRemove.map((a) => a.anchorId)
        let newAnchorList = newAnnotation.anchors.filter(
            (a) => !ids.includes(a.anchorId)
        )

        setNewAnnotation(
            buildAnnotation({
                ...newAnnotation,
                anchors: newAnchorList,
            })
        )
        anchorsToRemove.forEach((d) => {
            setAnnotationsActuallyMerged(
                new Map(
                    annotationsActuallyMerged.set(d.annoId, {
                        ...annotationsActuallyMerged.get(d.annoId),
                        anchors: annotationsActuallyMerged
                            .get(d.annoId)
                            .anchors.filter(
                                (anchId) => d.anchorId !== anchId.anchorId
                            ),
                    })
                )
            )
        })
    }

    const renderAnchors = (): React.ReactElement => {
        return (
            <>
                {newAnnotation.anchors.map((a, i) => {
                    const pseudoAnchorOnCommit =
                        createAnchorOnCommitFromAnchorObject(a)
                    return (
                        <div
                            className={`${anchorStyles['AnchorContainer']} ${anchorStyles['Suggestion']} ${anchorStyles['Merged']}`}
                            key={
                                a.anchorId +
                                a.parentId +
                                i +
                                'merge-anchor-list'
                            }
                        >
                            <PastVersion
                                key={
                                    a.anchorId +
                                    a.parentId +
                                    i +
                                    'merge-anchor-list-pv'
                                }
                                pastVersion={pseudoAnchorOnCommit}
                                handleClick={scrollWithRangeAndFile}
                                i={i}
                                mergeSelection={false}
                            />
                            <CatseyeButton
                                buttonClicked={() =>
                                    removeAnchorFromMergeAnnotation(
                                        a.anchorId,
                                        a.parentId
                                    )
                                }
                                key={
                                    a.anchorId +
                                    a.parentId +
                                    i +
                                    'merge-anchor-list-delete'
                                }
                                name="Delete"
                                icon={<DeleteIcon fontSize="small" />}
                            />
                        </div>
                    )
                })}
            </>
        )
    }

    const scrollWithRangeAndFile = (
        e: React.SyntheticEvent,
        id: string
    ): void => {
        e.stopPropagation()
        const anchor = newAnnotation.anchors.find((a) => a.anchorId === id)
        if (anchor)
            vscode.postMessage({
                command: 'scrollWithRangeAndFile',
                anchor: anchor.anchor,
                gitUrl: anchor.stableGitUrl,
            })
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
            }}
        >
            <ThemeProvider theme={theme}>
                <Card style={cardStyle}>
                    <CardContent>
                        <div className={styles['ContentContainer']}>
                            <p className={anchorStyles['SuggestionTitle']}>
                                Merged Annotation
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <AnnotationTypesBar
                                    currentTypes={types}
                                    editTypes={updateAnnotationTypes}
                                />
                                <div>
                                    <Checkbox
                                        onChange={() =>
                                            !getAllAnnotation
                                                ? getAllAnnotationContent()
                                                : removeAllAnnotationContent()
                                        }
                                        inputProps={{
                                            'aria-label': 'controlled',
                                        }}
                                        checked={getAllAnnotation}
                                    />
                                    Add all annotation bodies?
                                </div>
                                <div>
                                    <Checkbox
                                        onChange={() =>
                                            !getAllReplies
                                                ? getAllReplyContent()
                                                : removeAllReplyContent()
                                        }
                                        inputProps={{
                                            'aria-label': 'controlled',
                                        }}
                                        checked={getAllReplies}
                                    />
                                    Add all replies?
                                </div>
                                <CatseyeButton
                                    buttonClicked={addAnchor}
                                    name="Add Anchor"
                                    icon={<AnchorIcon fontSize="small" />}
                                />
                            </div>
                            {newAnnotation.anchors.length > 0
                                ? renderAnchors()
                                : null}
                            <TextEditor
                                content={
                                    printInternalAnnotationBodyRepresentation
                                }
                                submissionHandler={mergeAnnotations}
                                cancelHandler={cancelAnnotation}
                                showSplitButton={true}
                                focus={true}
                                placeholder={'Add annotation text'}
                                onChange={handleUserAddedAnnotationContent}
                            />
                            <ReplyContainer
                                replying={true}
                                replies={newAnnotation.replies}
                                username={githubUsername}
                                userId={userId}
                                submitReply={submitReply}
                                cancelReply={() => {}}
                                deleteReply={deleteReply}
                                focus={false}
                            />
                        </div>
                    </CardContent>
                    <hr className={styles['MergeLine']} />
                    <Grid
                        container
                        spacing={2}
                        // sx={{ width: '100%' }} component="div" disablePadding
                    >
                        {annotations.map((a: Annotation, i: number) => {
                            const map = annotationsActuallyMerged.get(a.id)
                            return (
                                <Grid item xs={4} md={6}>
                                    <AnnotationReference
                                        key={`merge-tsx-` + a.id}
                                        annotation={a}
                                        mergeInformation={map}
                                        partSelected={partSelected}
                                        removeAnchorFromMergeAnnotation={
                                            removeAnchorFromMergeAnnotation
                                        }
                                        scrollWithRangeAndFile={
                                            scrollWithRangeAndFile
                                        }
                                        annoNum={i + 1}
                                    />
                                </Grid>
                            )
                        })}
                    </Grid>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default MergeAnnotations
