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
import AdamiteButton from './annotationComponents/AdamiteButton'
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
    return
    // Array.isArray(a.offsets)
    //     ? a.offsets[0].startOffset
    // :
    a.offsets.startOffset
}

const getEndOffset = (a: AnnotationBodyLocationMetaData): number => {
    return
    // Array.isArray(a.offsets)
    //     ? a.offsets[a.offsets.length - 1].endOffset
    //     :
    a.offsets.endOffset
}

const getInternalOffsets = (a: AnnotationBodyLocationMetaData): Selection => {
    return
    // Array.isArray(a.offsets)
    //     ? { startOffset: getStartOffset(a), endOffset: getEndOffset(a) }
    //     :
    a.offsets
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
    const [githubUsernames, setGithubUsernames] = React.useState<string[]>([])
    const [userAddedText, setUserAddedText] = React.useState<string>('')
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
                if (Array.isArray(i.offsets)) {
                    const arr = []
                    // let internalContent = ""
                    i.offsets
                        .sort((a, b) => a.startOffset - b.startOffset)
                        .reduce((prevOffset, currOffset, idx, fullArr) => {
                            const sizeOfGap =
                                currOffset.startOffset - prevOffset.endOffset
                            let init = 0
                            const charsSeen: number = fullArr
                                .map((sel, j) =>
                                    j >= idx
                                        ? 0
                                        : sel.endOffset - sel.startOffset
                                )
                                .reduce((p, c) => p + c, init)
                            // because substring isnt inclusive
                            console.log('prev', prevOffset, 'curr', currOffset)
                            // let contentLen = i.content.length

                            const beginningIdx =
                                currOffset.startOffset -
                                currOffset.startOffset +
                                sizeOfGap +
                                charsSeen
                            const endIdx =
                                currOffset.endOffset -
                                currOffset.startOffset +
                                sizeOfGap +
                                charsSeen
                            // +
                            // 1
                            const contentStr = i.content.substring(
                                beginningIdx,
                                endIdx
                            )
                            console.log(
                                'indices - start',
                                beginningIdx,
                                'end',
                                endIdx,
                                'size',
                                sizeOfGap
                            )
                            console.log('contentStr??', contentStr)
                            if (!arr.length) {
                                const firstSubStr = i.content.substring(
                                    prevOffset.startOffset -
                                        prevOffset.startOffset,
                                    prevOffset.endOffset -
                                        prevOffset.startOffset
                                    // +
                                    // 1 // because substring isnt inclusive
                                )

                                arr.push({
                                    content: firstSubStr,
                                    startOffset: prevOffset.startOffset,
                                })
                            }
                            arr.push({
                                content: contentStr,
                                startOffset: currOffset.startOffset,
                            })
                            return currOffset
                        })
                    console.log('arr?', arr)
                    return arr
                } else {
                    return {
                        content: i.content,
                        startOffset: i.offsets.startOffset,
                    }
                }
            })
            .flat()
            .sort((a, b) => a.startOffset - b.startOffset)

        console.log('arrToPrint', arrToPrint)
        return arrToPrint.map((a) => a.content).join('')
    }

    const addNumberToOffset = (offsets: Selection, val: number): Selection => {
        return {
            startOffset: offsets.startOffset + val,
            endOffset: offsets.endOffset + val,
        }
    }

    const auditInternal = (
        newInternal: AnnotationBodyLocationMetaData[]
    ): AnnotationBodyLocationMetaData[] => {
        let charDiff = 0
        let audited = []
        newInternal.forEach((internal, i) => {
            let auditedInternal = { ...internal }
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
            }
            const isLenOfContentSameAsOffsetDiff =
                checkOffsetsEqualTextLength(auditedInternal)
            if (!isLenOfContentSameAsOffsetDiff) {
                // if(Array.isArray(auditedInternal.offsets)) {
                //     let newOffsets = []
                //     auditedInternal.offsets.forEach((off) => {
                //         let diff =
                //     })
                // }
            }
            audited.push(auditedInternal)
            // return auditedInternal
        })
        return audited
    }

    const checkOffsetsEqualTextLength = (
        auditedInternal: AnnotationBodyLocationMetaData
    ): boolean => {
        // if(Array.isArray(auditedInternal.offsets)) {
        //     let len = 0
        //     auditedInternal.offsets.reduce((prev, curr) => (prev + (curr.endOffset - curr.startOffset)), len)
        //     return len === auditedInternal.content.length
        //  }
        //  else {
        return (
            auditedInternal.content.length ===
            auditedInternal.offsets.endOffset -
                auditedInternal.offsets.startOffset
        )
        // }
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
        console.log('newList', newList)

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
        // console.log('message', message, 'newanno', newAnnotation)
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
                                        // updateDuplicateBundles(hasDups, a)
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
        const { annotation } = newAnnotation
        const annoToPass = buildAnnotation({
            ...newAnnotation,
            annotation:
                annotation.trim() !== annoContent.trim()
                    ? annotation + '\n' + annoContent
                    : annotation,
            shareWith,
            selected: willBePinned,
        })

        console.log('annotationsActuallyMerged', annotationsActuallyMerged)

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

    const resetMapByField = (field: string): void => {
        let newMap = new Map<string, MergeInformation>()
        // annotationsActuallyMerged
        annotationsActuallyMerged.forEach((mi, key) => {
            newMap.set(key, {
                ...mi,
                [field]: field === 'annotation' ? '' : [],
            })
        })
        console.log('new map in reset map', newMap)
        setAnnotationsActuallyMerged(newMap)
    }

    const handleUserAddedAnnotationContent = (
        newTextAreaValue: string,
        userText: string,
        selectedRange?: Selection
    ) => {
        setUserAddedText(
            getStringDifference(
                newTextAreaValue,
                newAnnotation.annotation
            ).trim()
        )
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
        console.log('hewwo??', userContent)
        userText.length
            ? updateInternalRepresentation('userAddedText', userContent)
            : updateInternalRepresentation('userRemovedText', userContent)
        setNewAnnotation(
            buildAnnotation({ ...newAnnotation, annotation: newTextAreaValue })
        )
    }

    const updateOffsets = (
        sel: Selection,
        sortedList: AnnotationBodyLocationMetaData[],
        operation: string = 'adding'
    ): AnnotationBodyLocationMetaData[] => {
        const firstIndexToMove = sortedList.findIndex(
            (s) =>
                // Array.isArray(s.offsets)
                //     ? s.offsets.some((off) => off.endOffset === sel.startOffset)
                // :
                s.offsets.endOffset === sel.startOffset
        )
        const len = sel.endOffset - sel.startOffset
        if (firstIndexToMove !== -1) {
            const updated = sortedList.map((b, i) => {
                if (i < firstIndexToMove || getEndOffset(b) <= sel.startOffset)
                    return b

                return {
                    ...b,
                    offsets:
                        // Array.isArray(b.offsets)
                        //     ? b.offsets.map((off, j) => {
                        //           if (off.endOffset < sel.startOffset) return off
                        //           return {
                        //               startOffset:
                        //                   operation === 'removing'
                        //                       ? off.startOffset - len
                        //                       : off.startOffset + len,
                        //               endOffset:
                        //                   operation === 'removing'
                        //                       ? off.endOffset - len
                        //                       : off.endOffset + len,
                        //           }
                        //       })
                        // :
                        {
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
                    offsets:
                        //  Array.isArray(b.offsets)
                        //     ? b.offsets.map((off, j) => {
                        //           if (off.endOffset < sel.startOffset) return off
                        //           return {
                        //               startOffset:
                        //                   operation === 'removing'
                        //                       ? off.startOffset - len
                        //                       : off.startOffset + len,
                        //               endOffset:
                        //                   operation === 'removing'
                        //                       ? off.endOffset - len
                        //                       : off.endOffset + len,
                        //           }
                        //       })
                        //     :
                        {
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
        console.log('sortedlist', sortedList)
        switch (typeOfChange) {
            case 'addAnnotation': {
                // const repToAddAfter = representationToChange.hasOwnProperty('replyId') ?
                // to do -- figure out how to get start and end offsets

                const indexToInsert = sortedList.findIndex(
                    (b) => representationToChange.timestamp > b.timestamp
                )
                console.log('index', indexToInsert)
                if (indexToInsert !== -1) {
                    const startOffset =
                        indexToInsert !== 0
                            ? getEndOffset(sortedList[indexToInsert - 1])
                            : 0 // we either start the annotation at the end of the last index, or start it at the beginning
                    const endOffset =
                        startOffset + representationToChange.content.length
                    const sel = { startOffset, endOffset }
                    // updateOffsets(sel, sortedList)
                    return sel
                } else {
                    console.log('in else')
                    const startOffset = sortedList.length
                        ? getEndOffset(sortedList[sortedList.length - 1])
                        : 0
                    const endOffset =
                        startOffset + representationToChange.content.length
                    return { startOffset, endOffset }
                }
            }
            case 'addReply': {
                // const annoToUpdate = internalAnnotationBodyRepresentation.find(
                //     (a) => a.annoId === representationToChange.annoId
                // )
                // if (annoToUpdate) {
                //     const newOffsets =
                //         annoToUpdate.replies && annoToUpdate.replies.length
                //             ? annoToUpdate.replies[
                //                   annoToUpdate.replies.length - 1
                //               ].offsets
                //             : null
                //     const offsets = newOffsets
                //         ? {
                //               startOffset: getStartOffset(annoToUpdate),
                //               endOffset:
                //                   getStartOffset(annoToUpdate) +
                //                   representationToChange.content.length,
                //           }
                //         : {
                //               startOffset: getEndOffset(annoToUpdate),
                //               endOffset:
                //                   getEndOffset(annoToUpdate) +
                //                   representationToChange.content.length,
                //           }
                //     return offsets
                // } else {
                //     const obj =
                //         internalAnnotationBodyRepresentation[
                //             internalAnnotationBodyRepresentation.length - 1
                //         ]
                //     return {
                //         startOffset: getStartOffset(obj),
                //         endOffset:
                //             getStartOffset(obj) +
                //             representationToChange.content.length,
                //     }
                // }
            }
        }
    }

    const createAnnotationInternalRepresentation = (
        anno: Annotation,
        currList?: AnnotationBodyLocationMetaData[]
    ): AnnotationBodyLocationMetaData => {
        // const anno: Annotation = obj as Annotation
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
        console.log('currList', currList, 'anno', baseInternal)
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
                }
                const replyOffsets: Selection = getOffsets(
                    baseInternal,
                    typeOfChange
                )
                const annoToUpdate = internalAnnotationBodyRepresentation.find(
                    (a) => a.annoId === reply.annoId
                )
                const newReply = {
                    ...baseInternal,
                    offsets: {
                        startOffset: replyOffsets.startOffset,
                        endOffset: replyOffsets.endOffset,
                    },
                }
                // const newAnno = annoToUpdate
                //     ? {
                //           ...annoToUpdate,
                //           replies:
                //               annoToUpdate.replies &&
                //               annoToUpdate.replies.length
                //                   ? annoToUpdate.replies.concat(newReply)
                //                   : [newReply],
                //           offsets: {
                //               startOffset: getStartOffset(annoToUpdate),
                //               endOffset: newReply.offsets.endOffset,
                //           },
                //       }
                // //     : newReply

                // const offsets = {
                //     startOffset: newAnno.offsets.startOffset,
                //     endOffset: newAnno.offsets.endOffset,
                // }
                // const updatedList = updateOffsets(
                //     offsets,
                //     internalAnnotationBodyRepresentation.sort(
                //         (a, b) => a.timestamp - b.timestamp
                //     )
                // )
                // setInternalAnnotationBodyRepresentation(updatedList)
                break
            }
            case 'userAddedText': {
                const userAddition: UserAddedText = obj as UserAddedText
                console.log('userAddition', userAddition)
                const surroundingMetadata =
                    internalAnnotationBodyRepresentation.length
                        ? findSurroundingAnnotationBodyMetaData(userAddition)
                        : null
                console.log('surroundingMetadaata', surroundingMetadata)
                let baseInternal = null
                let copy = null
                if (
                    surroundingMetadata &&
                    surroundingMetadata.otherInformation &&
                    surroundingMetadata.otherInformation.addingToUserText
                ) {
                    const objWereAddingTo =
                        internalAnnotationBodyRepresentation[
                            surroundingMetadata.index
                        ]
                    console.log('adding to this', objWereAddingTo)
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
                        content:
                            surroundingMetadata.insertionType ===
                            InsertionType.Before
                                ? userAddition.content + objWereAddingTo.content
                                : objWereAddingTo.content +
                                  userAddition.content,
                    }
                    // baseInternal = copy
                    console.log('was i high??', baseInternal)
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
                        const objWerePartitioning =
                            internalAnnotationBodyRepresentation[
                                surroundingMetadata.index
                            ]
                        console.log('objWerePartitioning', objWerePartitioning)
                        console.log(
                            'new offsets -- old offsets',
                            objWerePartitioning,
                            'useraddition??',
                            userAddition
                        )
                        const offsetWhichContainsUserAddition = Array.isArray(
                            objWerePartitioning.offsets
                        )
                            ? objWerePartitioning.offsets.find(
                                  (off) =>
                                      off.startOffset <=
                                          userAddition.offsets.startOffset &&
                                      off.endOffset >=
                                          userAddition.offsets.endOffset
                              )
                            : objWerePartitioning.offsets
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
                        const newOffsets = Array.isArray(
                            objWerePartitioning.offsets
                        )
                            ? objWerePartitioning.offsets
                                  .filter(
                                      (off) =>
                                          !offsetsAreEqual(
                                              off,
                                              offsetWhichContainsUserAddition
                                          )
                                  )
                                  .concat(partitionedOffsets)
                            : partitionedOffsets
                        copy = {
                            ...objWerePartitioning,
                            offsets: newOffsets,
                            // Array.isArray(objWerePartitioning.offsets)
                            //     ? objWerePartitioning.offsets.concat(
                            //           userAddition.offsets
                            //       )
                            //     : [
                            //           objWerePartitioning.offsets,
                            //           userAddition.offsets,
                            //       ],
                        }
                    }
                }
                // console.log(
                //     'copy',
                //     copy,
                //     'user addition',
                //     userAddition,
                //     'metadata',
                //     surroundingMetadata
                // )
                // const list = internalAnnotationBodyRepresentation
                //     .filter((a) => {
                //         copy !== null ? a.annoId !== copy.annoId : true
                //     })
                //     .concat(copy !== null ? copy : [])
                //     .sort((a, b) => a.timestamp - b.timestamp)
                let updatedList = updateOffsets(
                    baseInternal.offsets,
                    internalAnnotationBodyRepresentation
                )
                if (copy) {
                    updatedList = internalAnnotationBodyRepresentation
                        .filter((a) => a.annoId !== copy.annoId)
                        .concat(copy)
                }
                let didSwap = false // i hate this code so much
                updatedList = updatedList.map((a) => {
                    if (a.annoId === baseInternal.annoId) {
                        didSwap = true
                        return baseInternal
                    }
                    return a
                })
                console.log('updatedList???', updatedList)
                setInternalAnnotationBodyRepresentation(
                    didSwap ? updatedList : updatedList.concat(baseInternal)
                )
                break
            }
            case 'githubUsernames': {
                updateInternalRepresentationGithubUsernames(obj as string)
                break
            }
        }
    }

    const updateInternalRepresentationGithubUsernames = (
        list: string,
        internalRepresentationList?: AnnotationBodyLocationMetaData[]
    ): void => {
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
        if (Array.isArray(matchingObject.offsets)) {
            let type: InsertionType
            const didFind = matchingObject.offsets.some((off) => {
                if (off.startOffset === sel.endOffset) {
                    type = InsertionType.Before
                    return true
                } else if (off.endOffset === sel.startOffset) {
                    type = InsertionType.After
                    return true
                } else if (
                    off.startOffset < sel.startOffset &&
                    off.endOffset > sel.endOffset
                ) {
                    type = InsertionType.Inside
                    return true
                }
                return false
            })
            if (!didFind) {
                console.error('did not find')
            } else {
                return type
            }
        } else {
            const off = matchingObject.offsets
            if (off.startOffset === sel.endOffset) {
                return InsertionType.Before
            } else if (off.endOffset === sel.startOffset) {
                return InsertionType.After
            } else if (
                off.startOffset < sel.startOffset &&
                off.endOffset > sel.endOffset
            ) {
                return InsertionType.Inside
            }
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
                console.log('m!!!!!!!!!!!', m)
                if (Array.isArray(m.offsets)) {
                    return (
                        isUserAddedText(m) &&
                        m.offsets.some((off) => {
                            return (
                                off.startOffset ===
                                    userAddition.offsets.endOffset ||
                                off.endOffset ===
                                    userAddition.offsets.startOffset
                            )
                        })
                    )
                } else {
                    const startOffset = getStartOffset(m)
                    const endOffset = getEndOffset(m)
                    return (
                        isUserAddedText(m) &&
                        (startOffset === userAddition.offsets.endOffset ||
                            endOffset === userAddition.offsets.startOffset)
                    )
                }
            })
        console.log('isMatching????', isMatchingOtherUserText)

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
            console.log(
                'isMatching',
                surroundingMetadata,
                'matched on',
                isMatchingOtherUserText
            )
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
        console.log(
            'objs',
            objs,
            ' internal',
            internalAnnotationBodyRepresentation
        )
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
        let newAnnoBody = ''
        let newUserSet = new Set<string>()
        let hasRepliesInBody = false
        annotationsActuallyMerged.forEach((value, key) => {
            if (value.replies && value.replies.some((r) => r.inAnnoBody)) {
                hasRepliesInBody = true
                value.replies
                    .filter((r) => r.inAnnoBody)
                    .forEach((r) => {
                        newAnnoBody = generateNewAnnotationContent(
                            r.githubUsername,
                            key,
                            r.replyContent,
                            newAnnoBody
                        )
                        newUserSet.add(r.githubUsername)
                        // addAnnotationContent(r.githubUsername, key, r.replyContent, newAnnoBody)
                    })
            }
        })
        const finalAnnoBody = hasRepliesInBody
            ? resetAuthorListByUsernames(newAnnoBody, [...newUserSet]).trim()
            : ''
        setNewAnnotation(
            buildAnnotation({ ...newAnnotation, annotation: finalAnnoBody })
        )
        resetMapByField('annotation')
        setGetAllAnnotation(false)
        removeAllAnnotationMetadata()
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
        console.log('im a reduce pro now', newList)
        const usernameList = [
            ...new Set([
                ...internalAnnotationBodyRepresentation
                    .filter((a) => a.githubUsername.length > 0)
                    .map((i) => i.githubUsername),
                ...newList.map((i) => i.githubUsername),
            ]),
        ]
        updateInternalRepresentationGithubUsernames(
            generateList(usernameList),
            newList
        )
        // setInternalAnnotationBodyRepresentation(newList)
    }

    const removeAllAnnotationMetadata = (): void => {
        const newList = annotations
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .reduce(
                (
                    prevValue: AnnotationBodyLocationMetaData[],
                    currAnno: Annotation
                ) => {
                    const oldAnno = internalAnnotationBodyRepresentation.find(
                        (i) => i.annoId === currAnno.id
                    )
                    if (!oldAnno) {
                        return prevValue
                    }
                    const newList = updateOffsets(
                        getInternalOffsets(oldAnno),
                        prevValue,
                        'removing'
                    )
                    return newList.filter((o) => o.annoId !== currAnno.id)
                },
                internalAnnotationBodyRepresentation
            )
        console.log('im a reduce pro!!!!!!!!! now', newList)
        setInternalAnnotationBodyRepresentation(newList)
    }

    const getAllAnnotationContent = (): void => {
        const { annotation } = newAnnotation
        const combinedAnnotationBody: string = annotations
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .reduce((prevValue: string, currAnno: Annotation) => {
                let content = prevValue
                if (
                    !annotationsActuallyMerged.get(currAnno.id).annotation ||
                    annotationsActuallyMerged.get(currAnno.id).annotation === ''
                ) {
                    if (annotation !== '') {
                        content = generateNewAnnotationContent(
                            currAnno.githubUsername,
                            currAnno.id,
                            currAnno.annotation,
                            content
                        )
                    } else if (
                        currAnno.annotation &&
                        currAnno.annotation.length > 0
                    ) {
                        content += generateNewAnnotationContent(
                            currAnno.githubUsername,
                            currAnno.id,
                            currAnno.annotation
                        )
                    }
                }
                // updateInternalRepresentation('addAnnotation', currAnno)
                return content
            }, annotation)
        getAllAnnotationMetadata()
        const combinedAnnotationBodyWithAuthors = resetAuthorListByUsernames(
            combinedAnnotationBody,
            [
                ...new Set([
                    ...githubUsernames,
                    ...annotations.map((a) => a.githubUsername),
                ]),
            ]
        ).trim()
        setAllAnnotationsInMap(annotations, 'annotation')
        setNewAnnotation(
            buildAnnotation({
                ...newAnnotation,
                annotation: combinedAnnotationBodyWithAuthors,
            })
        )
        // addAnnotationContent(githubUsername)
        setGetAllAnnotation(true)
    }

    const resetAuthorListByUsernames = (
        annotationBody: string,
        usernames: string[]
        // annotations: Annotation[],
        // field: string
    ): string => {
        const cleanStr = annotationBody
            .split('{')
            .map((s, i) => {
                if (s.includes('}')) {
                    const firstIndex = s.indexOf('}')
                    const substr = s.substring(0, firstIndex)

                    if (usernames.some((u) => substr.includes(u))) {
                        return s.substring(firstIndex + 1)
                    } else {
                        return '{' + s
                    }
                }

                return s
            })
            .join('')

        return cleanStr + ' ' + generateList(usernames)
    }

    // don't think this will work for anchors since we add metadata.. maybe also with replies..
    const setAllAnnotationsInMap = (
        annotations: Annotation[],
        field: string
    ): void => {
        let map = new Map<string, MergeInformation>(annotationsActuallyMerged)
        annotations.forEach((anno) => {
            map.set(anno.id, { ...map.get(anno.id), [field]: anno[field] })
        })
        console.log('in setall annotations in map map???', map)
        setAnnotationsActuallyMerged(map)
    }

    const generateNewAnnotationContent = (
        githubUsername: string,
        annoId: string,
        selectedAnnotation: string,
        alreadyBuiltAnnotationContent?: string
    ): string => {
        const { annotation } = newAnnotation
        const contentToUse =
            alreadyBuiltAnnotationContent !== undefined
                ? alreadyBuiltAnnotationContent
                : annotation
        const partOfStringToAddTo = contentToUse.includes(
            '{' + githubUsernames[0]
        )
            ? contentToUse.split('{' + githubUsernames[0])[0]
            : ''

        const listOfAuthors = handleUpdateGithubUsernames(
            githubUsername,
            annoId,
            'add'
        )

        const newAnnotationContent =
            contentToUse.trim() !== ''
                ? `${partOfStringToAddTo} \n${selectedAnnotation} ${listOfAuthors}`
                : `${selectedAnnotation} ${listOfAuthors}`
        return newAnnotationContent
    }

    const addAnnotationContent = (
        githubUsername: string,
        annoId: string,
        selectedAnnotation: string,
        alreadyBuiltAnnotationContent?: string
    ) => {
        const newAnnotationContent = alreadyBuiltAnnotationContent
            ? alreadyBuiltAnnotationContent
            : generateNewAnnotationContent(
                  githubUsername,
                  annoId,
                  selectedAnnotation
              )
        console.log('new content', newAnnotationContent)
        setNewAnnotation(
            buildAnnotation({
                ...newAnnotation,
                annotation: newAnnotationContent.trim(),
            })
        )

        setAnnotationsActuallyMerged(
            new Map(
                annotationsActuallyMerged.set(annoId, {
                    ...annotationsActuallyMerged.get(annoId),
                    annotation: newAnnotationContent.trim(),
                })
            )
        )
    }

    const generateRemovedAnnotationContent = (
        selectedAnnotation: string,
        content?: string
    ): string => {
        const { annotation } = newAnnotation
        const contentToRemoveFrom = content ? content : annotation
        const beginningOfAnnotation = contentToRemoveFrom.indexOf(
            '\n' + selectedAnnotation
        )
        const endOfAnnotation =
            contentToRemoveFrom.indexOf('\n' + selectedAnnotation) +
            selectedAnnotation.length +
            1
        const newAnnotationContent =
            contentToRemoveFrom.substring(0, beginningOfAnnotation) +
            contentToRemoveFrom.substring(
                endOfAnnotation,
                annotation.indexOf(`{${githubUsernames[0]}`)
            )
        return newAnnotationContent
    }

    const removeAnnotationContent = (
        selectedAnnotation: string,
        githubUsername: string,
        annoId: string
    ) => {
        const newAnnotationContent =
            generateRemovedAnnotationContent(selectedAnnotation)
        const authorList = handleUpdateGithubUsernames(
            githubUsername,
            annoId,
            'remove',
            'annotation'
        )
        const finalStr = `${newAnnotationContent} ${authorList}`.trim()
        setNewAnnotation(
            buildAnnotation({
                ...newAnnotation,
                annotation: finalStr,
            })
        )
        console.log('set anno actually merged remove anno content', {
            ...annotationsActuallyMerged.get(annoId),
            annotation: '',
        })
        setAnnotationsActuallyMerged(
            new Map(
                annotationsActuallyMerged.set(annoId, {
                    ...annotationsActuallyMerged.get(annoId),
                    annotation: '',
                })
            )
        )
    }

    const handleUpdateAnnotationContent = (
        selectedAnnotation: string,
        annoId: string,
        githubUsername: string
    ) => {
        // const { selectedAnnotation } = object
        // const { annotation } = newAnnotation

        if (
            annotationsActuallyMerged.get(annoId).annotation === '' ||
            !annotationsActuallyMerged.get(annoId).annotation // map is empty/this anno hasnt been added
        ) {
            addAnnotationContent(githubUsername, annoId, selectedAnnotation)
        } else {
            removeAnnotationContent(selectedAnnotation, githubUsername, annoId)
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
        const githubUsername = object.githubUsername
        const { level, operation, annoId, ...rest } = object
        const { annotation } = newAnnotation
        if (operation === 'remove') {
            const mergedReply = annotationsActuallyMerged
                .get(object.annoId)
                .replies.find((r) => r.id === object.id)
            if (mergedReply.inAnnoBody) {
                const beginningOfReply = annotation.indexOf(
                    '\n' + mergedReply.replyContent
                )
                const endOfReply =
                    annotation.indexOf('\n' + mergedReply.replyContent) +
                    mergedReply.replyContent.length +
                    1
                const newAnnotationContent =
                    annotation.substring(0, beginningOfReply) +
                    annotation.substring(
                        endOfReply,
                        annotation.indexOf(`{${githubUsernames[0]}`)
                    )
                const authorList = handleUpdateGithubUsernames(
                    githubUsername,
                    annoId,
                    'remove',
                    'replies',
                    mergedReply.id
                )
                const finalStr = `${newAnnotationContent} ${authorList}`.trim()
                setNewAnnotation(
                    buildAnnotation({
                        ...newAnnotation,
                        annotation: finalStr,
                    })
                )

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
                const partOfStringToAddTo = annotation.includes(
                    '{' + githubUsernames[0]
                )
                    ? annotation.split('{' + githubUsernames[0])[0]
                    : ''
                const replyToAdd = { ...rest, inAnnoBody: true }

                const listOfAuthors = handleUpdateGithubUsernames(
                    githubUsername,
                    annoId,
                    'add',
                    'replies'
                    // replyToAdd.id
                )

                const newAnnotationContent =
                    annotation.trim() !== ''
                        ? `${partOfStringToAddTo} \n${object.replyContent} ${listOfAuthors}`.trim()
                        : `${object.replyContent} ${listOfAuthors}`.trim()

                setNewAnnotation(
                    buildAnnotation({
                        ...newAnnotation,
                        annotation: newAnnotationContent,
                    })
                )

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
            // TODO: add UI to move reply content up to main anno body
            // add CSS to make more clear if the reply has been selected or not
        }
    }

    const partSelected = (type: string, object: any) => {
        // const { annoId, githubUsername } = object
        // const { annotation } = newAnnotation
        switch (type) {
            case 'annotation':
                handleUpdateAnnotationContent(
                    object.selectedAnnotation,
                    object.annoId,
                    object.githubUsername
                )

                break
            case 'anchor':
                // would be better to use text in order to grab subset of anchor
                // could use tokenization that we use for reanchoring to create offset tokens
                handleUpdateAnchor(object)
                break
            case 'reply':
                handleUpdateReplies(object)
                break
            // const { annoId, level, ...rest } = object
        }
    }

    const generateList = (listOfAuthors: string[]): string => {
        // console.log('what?', listOfAuthors)
        return (
            '{' +
            listOfAuthors
                .map((u, i) =>
                    i !== listOfAuthors.length - 1 ? u + ', ' : u + '}'
                )
                .join('')
        )
    }

    const addNameToGithubUsernames = (username: string): string => {
        const listOfAuthors = !githubUsernames.includes(username)
            ? [...new Set(githubUsernames.concat(username))]
            : githubUsernames
        !githubUsernames.includes(username) && setGithubUsernames(listOfAuthors)
        const listStr = generateList(listOfAuthors)
        return listStr
    }

    const handleUpdateGithubUsernames = (
        githubUsername: string,
        annoId: string,
        operation: string,
        fieldChanging?: string,
        replyId?: string
    ): string => {
        if (operation === 'add') {
            // update
            const listStr = addNameToGithubUsernames(githubUsername)
            updateInternalRepresentation('githubUsernames', listStr)
            return listStr
        } else if (operation === 'remove') {
            // let hasSeen = false
            const usernamesInBody = internalAnnotationBodyRepresentation
                .filter((a) =>
                    replyId
                        ? a.annoId !== annoId &&
                          a.replyId &&
                          a.replyId !== replyId
                        : a.annoId !== annoId
                )
                .map((a) => a.githubUsername)
            const formattedList = usernamesInBody.length
                ? generateList(usernamesInBody)
                : ''
            updateInternalRepresentation('githubUsernames', formattedList)
            return formattedList
        }
        //
    }

    // consider moving this out so it can be used in regular annotation component
    // const renderNewAnnotationContent = (): React.ReactElement => {
    //     const annotationSplitOnNewline = newAnnotation.annotation.split('\n')
    //     return (
    //         <div className={styles['AnnoContentContainer']}>
    //             {annotationSplitOnNewline.map((annotation) => {
    //                 const split: string[] = annotation.split(' said:')
    //                 const info: string = split[0] + ' said:' // since split isn't inclusive have to add it back in ! stupid !
    //                 const formattedInfo = (
    //                     <span className={styles['QuoteInfo']}>{info}</span>
    //                 )
    //                 return (
    //                     <>
    //                         {formattedInfo}
    //                         <div className={styles['bq']}>{split[1]}</div>
    //                     </>
    //                 )
    //             })}
    //         </div>
    //     )
    // }

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
        console.log('anchorsToRemove', anchorsToRemove)

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
                            <AdamiteButton
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
                                        // onChange={
                                        //     !getAllReplies
                                        //         ? getAllReplyContent()
                                        //         : removeAllReplyContent()
                                        // }
                                        inputProps={{
                                            'aria-label': 'controlled',
                                        }}
                                        checked={getAllReplies}
                                    />
                                    Add all replies?
                                </div>
                                <AdamiteButton
                                    buttonClicked={addAnchor}
                                    name="Add Anchor"
                                    icon={<AnchorIcon fontSize="small" />}
                                />
                            </div>
                            {newAnnotation.anchors.length > 0
                                ? renderAnchors()
                                : null}
                            {/* {newAnnotation.annotation !== ''
                                ? renderNewAnnotationContent()
                                : null} */}
                            <TextEditor
                                // content={newAnnotation.annotation}
                                // content={internalAnnotationBodyRepresentation
                                //     .map((i) => i.content)
                                //     .join('')}
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
                                        // alreadySelectedAnchors={
                                        //     map
                                        //         ? map.anchors.map(
                                        //               (a) => a.anchorId
                                        //           )
                                        //         : []
                                        // }
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

// annotationsActuallyMerged.forEach((mi, k) => {
//         // if(fieldChanging && fieldChanging === 'annotation') {
//         console.log('k', k, 'mi', mi)
//         const anno = annotations.find((a) => a.id === k)
//         console.log('anno', anno)
//         if (k !== annoId) {
//             if (anno) {
//                 if (
//                     mi.annotation &&
//                     mi.annotation !== '' &&
//                     anno.githubUsername === githubUsername
//                 ) {
//                     hasSeen = true
//                     return
//                 } else if (mi.replies && mi.replies.length > 0) {
//                     hasSeen = anno.replies.some(
//                         (r) =>
//                             mi.replies
//                                 .map((re) => re.id)
//                                 .includes(r.id) &&
//                             r.githubUsername === githubUsername
//                     )
//                     if (hasSeen) {
//                         return
//                     }
//                 }
//             }
//         } else {
//             if (fieldChanging === 'annotation') {
//                 hasSeen = anno.replies.some(
//                     (r) =>
//                         mi.replies &&
//                         mi.replies.map((re) => re.id).includes(r.id) &&
//                         r.githubUsername === githubUsername
//                 )
//                 if (hasSeen) {
//                     return
//                 }
//             } else if (fieldChanging === 'replies') {
//                 console.log(
//                     'reply ids',
//                     mi.replies.map((re) => re.id),
//                     'passed in id',
//                     replyId,
//                     'first part checking anno true',
//                     mi.annotation &&
//                         mi.annotation !== '' &&
//                         anno.githubUsername === githubUsername,
//                     'second part checking replies true',
//                     anno.replies.some(
//                         (r) =>
//                             mi.replies
//                                 .map((re) => re.id)
//                                 .filter((id) => id !== replyId)
//                                 .includes(r.id) &&
//                             r.githubUsername === githubUsername
//                     )
//                 )
//                 hasSeen =
//                     (mi.annotation &&
//                         mi.annotation !== '' &&
//                         anno.githubUsername === githubUsername) ||
//                     anno.replies.some(
//                         (r) =>
//                             mi.replies
//                                 .map((re) => re.id)
//                                 .filter((id) => id !== replyId)
//                                 .includes(r.id) &&
//                             r.githubUsername === githubUsername
//                     )
//                 if (hasSeen) {
//                     return
//                 }
//             }
//         }

//         // }
//     })
//     if (hasSeen) {
//         console.log('is true', hasSeen)
//         return (
//             '{' +
//             githubUsernames
//                 .map((u, i) =>
//                     i !== githubUsernames.length - 1
//                         ? u + ', '
//                         : u + '}'
//                 )
//                 .join()
//         )
//     } else {
//         const newAuthorList = githubUsernames.filter(
//             (u) => u !== githubUsername
//         )
//         console.log('is false... new list', newAuthorList)
//         setGithubUsernames(newAuthorList)
//         if (newAuthorList.length) {
//             return (
//                 '{' +
//                 newAuthorList
//                     .map((u, i) =>
//                         i !== newAuthorList.length - 1
//                             ? u + ', '
//                             : u + '}'
//                     )
//                     .join()
//             )
//         } else {
//             return ''
//         }
//     }
// } else {
//     return ''
// }
