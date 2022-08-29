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
    replies?: AnnotationBodyLocationMetaData[]
}

interface AnnotationBodyLocationMetaData extends AnnotationBodyMetaData {
    // startOffset: number
    // endOffset: number
    offsets: Selection | Selection[]
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
}

interface Props {
    vscode: any
    notifyDone: () => void
    username: string
    userId: string
    annotations: Annotation[]
}

const getStartOffset = (a: AnnotationBodyLocationMetaData): number => {
    return Array.isArray(a.offsets)
        ? a.offsets[0].startOffset
        : a.offsets.startOffset
}

const getEndOffset = (a: AnnotationBodyLocationMetaData): number => {
    return Array.isArray(a.offsets)
        ? a.offsets[a.offsets.length - 1].endOffset
        : a.offsets.endOffset
}

const isUserAddedText = (obj: any): obj is UserAddedText => {
    return obj.hasOwnProperty('offsets')
}

const isSelection = (obj: any): obj is Selection => {
    return obj.hasOwnProperty('startOffset') && obj.hasOwnProperty('endOffset')
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

    const setInternalAnnotationBodyRepresentation = (
        newInternalAnnotationBodyRepresentation: AnnotationBodyLocationMetaData[]
    ): void => {
        const newList = newInternalAnnotationBodyRepresentation.sort((a, b) => {
            const aOffset = getStartOffset(a)
            const bOffset = getStartOffset(b)
            return aOffset - bOffset
        })
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
            githubUsername: username ?? '',
            timestamp: new Date().getTime(),
            id: username
                ? username + new Date().getTime()
                : '-' + new Date().getTime(),
            offsets: selectedRange ?? { startOffset: 0, endOffset: 0 },
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
        sortedList: AnnotationBodyLocationMetaData[]
    ): AnnotationBodyLocationMetaData[] => {
        const firstIndexToMove = sortedList.findIndex((s) =>
            Array.isArray(s.offsets)
                ? s.offsets.some((off) => off.endOffset === sel.startOffset)
                : s.offsets.endOffset === sel.startOffset
        )

        if (firstIndexToMove !== -1) {
            const updated = sortedList.map((b, i) => {
                if (i < firstIndexToMove || getEndOffset(b) <= sel.startOffset)
                    return b

                return {
                    ...b,
                    offsets: Array.isArray(b.offsets)
                        ? b.offsets.map((off, j) => {
                              if (off.endOffset < sel.startOffset) return off
                              return {
                                  startOffset:
                                      off.startOffset +
                                      (sel.endOffset - sel.startOffset),
                                  endOffset:
                                      off.endOffset +
                                      (sel.endOffset - sel.startOffset),
                              }
                          })
                        : {
                              startOffset:
                                  b.offsets.startOffset +
                                  (sel.endOffset - sel.startOffset),
                              endOffset:
                                  b.offsets.endOffset +
                                  (sel.endOffset - sel.startOffset),
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
                    offsets: Array.isArray(b.offsets)
                        ? b.offsets.map((off, j) => {
                              if (off.endOffset < sel.startOffset) return off
                              return {
                                  startOffset:
                                      off.startOffset +
                                      (sel.endOffset - sel.startOffset),
                                  endOffset:
                                      off.endOffset +
                                      (sel.endOffset - sel.startOffset),
                              }
                          })
                        : {
                              startOffset:
                                  b.offsets.startOffset +
                                  (sel.endOffset - sel.startOffset),
                              endOffset:
                                  b.offsets.endOffset +
                                  (sel.endOffset - sel.startOffset),
                          },
                }
            })
            return updated
        }
    }

    const getOffsets = (
        representationToChange: AnnotationBodyMetaData,
        typeOfChange: string
    ): Selection => {
        const sortedList = internalAnnotationBodyRepresentation.sort(
            (a, b) => a.timestamp - b.timestamp
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
                    // updateOffsets(sel, sortedList)
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
                if (annoToUpdate) {
                    const newOffsets =
                        annoToUpdate.replies && annoToUpdate.replies.length
                            ? annoToUpdate.replies[
                                  annoToUpdate.replies.length - 1
                              ].offsets
                            : null
                    const offsets = newOffsets
                        ? {
                              startOffset: getStartOffset(annoToUpdate),
                              endOffset:
                                  getStartOffset(annoToUpdate) +
                                  representationToChange.content.length,
                          }
                        : {
                              startOffset: getEndOffset(annoToUpdate),
                              endOffset:
                                  getEndOffset(annoToUpdate) +
                                  representationToChange.content.length,
                          }
                    return offsets
                } else {
                    const obj =
                        internalAnnotationBodyRepresentation[
                            internalAnnotationBodyRepresentation.length - 1
                        ]
                    return {
                        startOffset: getStartOffset(obj),
                        endOffset:
                            getStartOffset(obj) +
                            representationToChange.content.length,
                    }
                }
            }
        }
    }

    const updateInternalRepresentation = (typeOfChange: string, obj: any) => {
        switch (typeOfChange) {
            case 'addAnnotation': {
                const anno: Annotation = obj as Annotation
                const baseInternal: AnnotationBodyMetaData = {
                    source: AnnotationBodySources.Annotation,
                    annoId: anno.id,
                    timestamp:
                        anno.lastEditTime &&
                        anno.lastEditTime > anno.createdTimestamp
                            ? anno.lastEditTime
                            : anno.createdTimestamp,
                    content: anno.annotation,
                    githubUsername: anno.githubUsername,
                }
                const offsets = getOffsets(baseInternal, typeOfChange)

                const internalRepresentation: AnnotationBodyLocationMetaData = {
                    ...baseInternal,
                    offsets: {
                        startOffset: offsets.startOffset,
                        endOffset: offsets.endOffset,
                    },
                }
                const updatedList = updateOffsets(
                    offsets,
                    internalAnnotationBodyRepresentation.sort(
                        (a, b) => a.timestamp - b.timestamp
                    )
                )
                setInternalAnnotationBodyRepresentation(
                    updatedList.concat(internalRepresentation)
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
                const newAnno = annoToUpdate
                    ? {
                          ...annoToUpdate,
                          replies:
                              annoToUpdate.replies &&
                              annoToUpdate.replies.length
                                  ? annoToUpdate.replies.concat(newReply)
                                  : [newReply],
                          offsets: {
                              startOffset: getStartOffset(annoToUpdate),
                              endOffset: newReply.offsets.endOffset,
                          },
                      }
                    : newReply

                const offsets = {
                    startOffset: newAnno.offsets.startOffset,
                    endOffset: newAnno.offsets.endOffset,
                }
                const updatedList = updateOffsets(
                    offsets,
                    internalAnnotationBodyRepresentation.sort(
                        (a, b) => a.timestamp - b.timestamp
                    )
                )
                setInternalAnnotationBodyRepresentation(updatedList)
                break
            }
            case 'userAddedText': {
                const userAddition: UserAddedText = obj as UserAddedText

                const surroundingMetadata =
                    internalAnnotationBodyRepresentation.length
                        ? findSurroundingAnnotationBodyMetaData(userAddition)
                        : null

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
                    baseInternal = {
                        ...objWereAddingTo,
                        offsets: {
                            startOffset:
                                surroundingMetadata.insertionType ===
                                InsertionType.After
                                    ? getStartOffset(objWereAddingTo)
                                    : userAddition.offsets.startOffset,
                            endOffset:
                                getEndOffset(objWereAddingTo) +
                                userAddition.content.length,
                        },
                        content: objWereAddingTo.content + userAddition.content,
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
                        const objWerePartitioning =
                            internalAnnotationBodyRepresentation[
                                surroundingMetadata.index
                            ]
                        copy = {
                            ...objWerePartitioning,
                            offsets: Array.isArray(objWerePartitioning.offsets)
                                ? objWerePartitioning.offsets.concat(
                                      userAddition.offsets
                                  )
                                : [
                                      objWerePartitioning.offsets,
                                      userAddition.offsets,
                                  ],
                        }
                    }
                }
                const list = internalAnnotationBodyRepresentation
                    .filter((a) => {
                        copy !== null ? a.annoId !== copy.annoId : true
                    })
                    .concat(copy !== null ? copy : [])
                    .sort((a, b) => a.timestamp - b.timestamp)
                const updatedList = updateOffsets(baseInternal.offsets, list)
                setInternalAnnotationBodyRepresentation(
                    updatedList.concat(baseInternal)
                )
                break
            }
        }
    }

    const findSurroundingAnnotationBodyMetaData = (
        userAddition: UserAddedText
    ): SurroundingMetadata => {
        let surroundingMetadata: SurroundingMetadata = null
        let insertionType: InsertionType = null
        let otherInformation = null

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
                console.log('in else selse')
                if (isUserAddedText(obj)) {
                    otherInformation = {
                        addingToUserText: true,
                        id: obj.id,
                        partitioningThisTypeOfObject:
                            AnnotationBodySources.User,
                    }
                }
                return isUserAddedText(obj)
                    ? {
                          insertionType: InsertionType.Before,
                          index: 0,
                          otherInformation,
                      }
                    : {
                          insertionType: InsertionType.Before,
                          index: 0,
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
                updateInternalRepresentation('addAnnotation', currAnno)
                return content
            }, annotation)
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

    const handleUpdateGithubUsernames = (
        githubUsername: string,
        annoId: string,
        operation: string,
        fieldChanging?: string,
        replyId?: string
    ): string => {
        if (operation === 'add') {
            const listOfAuthors = !githubUsernames.includes(githubUsername)
                ? [...new Set(githubUsernames.concat(githubUsername))]
                : githubUsernames
            !githubUsernames.includes(githubUsername) &&
                setGithubUsernames(listOfAuthors)

            return generateList(listOfAuthors)
        } else if (operation === 'remove') {
            let hasSeen = false
            annotationsActuallyMerged.forEach((mi, k) => {
                // if(fieldChanging && fieldChanging === 'annotation') {
                console.log('k', k, 'mi', mi)
                const anno = annotations.find((a) => a.id === k)
                console.log('anno', anno)
                if (k !== annoId) {
                    if (anno) {
                        if (
                            mi.annotation &&
                            mi.annotation !== '' &&
                            anno.githubUsername === githubUsername
                        ) {
                            hasSeen = true
                            return
                        } else if (mi.replies && mi.replies.length > 0) {
                            hasSeen = anno.replies.some(
                                (r) =>
                                    mi.replies
                                        .map((re) => re.id)
                                        .includes(r.id) &&
                                    r.githubUsername === githubUsername
                            )
                            if (hasSeen) {
                                return
                            }
                        }
                    }
                } else {
                    if (fieldChanging === 'annotation') {
                        hasSeen = anno.replies.some(
                            (r) =>
                                mi.replies &&
                                mi.replies.map((re) => re.id).includes(r.id) &&
                                r.githubUsername === githubUsername
                        )
                        if (hasSeen) {
                            return
                        }
                    } else if (fieldChanging === 'replies') {
                        console.log(
                            'reply ids',
                            mi.replies.map((re) => re.id),
                            'passed in id',
                            replyId,
                            'first part checking anno true',
                            mi.annotation &&
                                mi.annotation !== '' &&
                                anno.githubUsername === githubUsername,
                            'second part checking replies true',
                            anno.replies.some(
                                (r) =>
                                    mi.replies
                                        .map((re) => re.id)
                                        .filter((id) => id !== replyId)
                                        .includes(r.id) &&
                                    r.githubUsername === githubUsername
                            )
                        )
                        hasSeen =
                            (mi.annotation &&
                                mi.annotation !== '' &&
                                anno.githubUsername === githubUsername) ||
                            anno.replies.some(
                                (r) =>
                                    mi.replies
                                        .map((re) => re.id)
                                        .filter((id) => id !== replyId)
                                        .includes(r.id) &&
                                    r.githubUsername === githubUsername
                            )
                        if (hasSeen) {
                            return
                        }
                    }
                }

                // }
            })
            if (hasSeen) {
                console.log('is true', hasSeen)
                return (
                    '{' +
                    githubUsernames
                        .map((u, i) =>
                            i !== githubUsernames.length - 1
                                ? u + ', '
                                : u + '}'
                        )
                        .join()
                )
            } else {
                const newAuthorList = githubUsernames.filter(
                    (u) => u !== githubUsername
                )
                console.log('is false... new list', newAuthorList)
                setGithubUsernames(newAuthorList)
                if (newAuthorList.length) {
                    return (
                        '{' +
                        newAuthorList
                            .map((u, i) =>
                                i !== newAuthorList.length - 1
                                    ? u + ', '
                                    : u + '}'
                            )
                            .join()
                    )
                } else {
                    return ''
                }
            }
        } else {
            return ''
        }
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
                                content={newAnnotation.annotation}
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
                                username={username}
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
