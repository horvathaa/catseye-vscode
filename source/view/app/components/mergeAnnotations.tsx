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

interface Props {
    vscode: any
    notifyDone: () => void
    username: string
    userId: string
    annotations: Annotation[]
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
            annotation: annotation + '\n' + annoContent,
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

    const partSelected = (type: string, object: any) => {
        const { annoId, githubUsername } = object
        const { annotation } = newAnnotation
        switch (type) {
            case 'annotation':
                const { selectedAnnotation } = object

                if (
                    annotationsActuallyMerged.get(annoId).annotation === '' ||
                    !annotationsActuallyMerged.get(annoId).annotation // map is empty/this anno hasnt been added
                ) {
                    const partOfStringToAddTo = annotation.includes(
                        '{' + githubUsernames[0]
                    )
                        ? annotation.split('{' + githubUsernames[0])[0]
                        : ''

                    const listOfAuthors = handleUpdateGithubUsernames(
                        githubUsername,
                        annoId,
                        'add'
                    )

                    const newAnnotationContent =
                        annotation !== ''
                            ? `${partOfStringToAddTo} \n${selectedAnnotation} ${listOfAuthors}`
                            : `${selectedAnnotation} ${listOfAuthors}`
                    console.log('newANnotationcontent', newAnnotationContent)
                    setNewAnnotation(
                        buildAnnotation({
                            ...newAnnotation,
                            annotation: newAnnotationContent,
                        })
                    )
                    // const updatedMergeObj = {
                    //     ...annotationsActuallyMerged[annoId],
                    //     annotation,
                    // }
                    setAnnotationsActuallyMerged(
                        new Map(
                            annotationsActuallyMerged.set(annoId, {
                                ...annotationsActuallyMerged.get(annoId),
                                annotation: selectedAnnotation,
                            })
                        )
                        //     [
                        //     ...new Set([...annotationsActuallyMerged, annoId]),
                        // ]
                    )
                } else {
                    const beginningOfAnnotation = annotation.indexOf(
                        '\n' + selectedAnnotation
                    )
                    const endOfAnnotation =
                        annotation.indexOf('\n' + selectedAnnotation) +
                        selectedAnnotation.length +
                        1
                    const newAnnotationContent =
                        annotation.substring(0, beginningOfAnnotation) +
                        annotation.substring(
                            endOfAnnotation,
                            annotation.indexOf(`{${githubUsernames[0]}`)
                        )
                    const authorList = handleUpdateGithubUsernames(
                        githubUsername,
                        annoId,
                        'remove',
                        'annotation'
                    )
                    setNewAnnotation(
                        buildAnnotation({
                            ...newAnnotation,
                            annotation: newAnnotationContent + ' ' + authorList,
                        })
                    )
                    setAnnotationsActuallyMerged(
                        new Map(
                            annotationsActuallyMerged.set(annoId, {
                                ...annotationsActuallyMerged.get(annoId),
                                annotation: '',
                            })
                        )
                    )
                }

                break
            case 'anchor':
                // would be better to use text in order to grab subset of anchor
                // could use tokenization that we use for reanchoring to create offset tokens
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
                    duplicateBundles[anchorText].annoIds.forEach(
                        (annoId, i) => {
                            const otherDups = duplicateBundles[
                                anchorText
                            ].annoIds
                                .map((a, idx) => {
                                    return (
                                        idx !== i && {
                                            annoId: a,
                                            anchorId:
                                                duplicateBundles[anchorText]
                                                    .anchorIds[idx],
                                        }
                                    )
                                })
                                .filter((an) => typeof an !== 'boolean') // stupid
                            setAnnotationsActuallyMerged(
                                new Map(
                                    annotationsActuallyMerged.set(annoId, {
                                        ...annotationsActuallyMerged.get(
                                            annoId
                                        ),
                                        anchors: annotationsActuallyMerged
                                            .get(annoId)
                                            .anchors.concat({
                                                anchorId:
                                                    duplicateBundles[anchorText]
                                                        .anchorIds[i],
                                                duplicateOf: [],
                                                hasDuplicates: otherDups,
                                            }), // need to double check if this is true
                                    })
                                )
                            )
                        }
                    )
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

                break
            case 'reply':
                // const { annoId, level, ...rest } = object
                const { level, operation, ...rest } = object
                if (
                    operation === 'remove'
                    // newAnnotation.replies.map((r) => r.id).includes(object.id)
                ) {
                    const mergedReply = annotationsActuallyMerged
                        .get(object.annoId)
                        .replies.find((r) => r.id === object.id)
                    if (mergedReply.inAnnoBody) {
                        const beginningOfReply = annotation.indexOf(
                            '\n' + mergedReply.replyContent
                        )
                        const endOfReply =
                            annotation.indexOf(
                                '\n' + mergedReply.replyContent
                            ) +
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
                            'replies'
                        )
                        setNewAnnotation(
                            buildAnnotation({
                                ...newAnnotation,
                                annotation:
                                    newAnnotationContent + ' ' + authorList,
                            })
                        )
                        setAnnotationsActuallyMerged(
                            new Map(
                                annotationsActuallyMerged.set(annoId, {
                                    ...annotationsActuallyMerged.get(annoId),
                                    replies: annotationsActuallyMerged
                                        .get(annoId)
                                        .replies.filter(
                                            (r) => r.id !== mergedReply.id
                                        ),
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
                                    ...annotationsActuallyMerged.get(
                                        object.annoId
                                    ),
                                    replies: annotationsActuallyMerged
                                        .get(object.annoId)
                                        .replies.filter(
                                            (r) => r.id !== object.id
                                        ), // need to double check if this is true
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

                        const listOfAuthors = handleUpdateGithubUsernames(
                            githubUsername,
                            annoId,
                            'add'
                        )

                        const newAnnotationContent =
                            annotation !== ''
                                ? `${partOfStringToAddTo} \n${object.replyContent} ${listOfAuthors}`
                                : `${object.replyContent} ${listOfAuthors}`
                        console.log(
                            'newANnotationcontent',
                            newAnnotationContent
                        )
                        setNewAnnotation(
                            buildAnnotation({
                                ...newAnnotation,
                                annotation: newAnnotationContent,
                            })
                        )
                        // const updatedMergeObj = {
                        //     ...annotationsActuallyMerged[annoId],
                        //     annotation,
                        // }
                        const mergedReplies =
                            annotationsActuallyMerged.get(annoId).replies
                        const replyToAdd = { ...rest, inAnnoBody: true }
                        setAnnotationsActuallyMerged(
                            new Map(
                                annotationsActuallyMerged.set(annoId, {
                                    ...annotationsActuallyMerged.get(annoId),
                                    replies: mergedReplies
                                        ? mergedReplies.concat(replyToAdd)
                                        : [replyToAdd],
                                })
                            )
                            //     [
                            //     ...new Set([...annotationsActuallyMerged, annoId]),
                            // ]
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

            return (
                '{' +
                listOfAuthors
                    .map((u, i) =>
                        i !== listOfAuthors.length - 1 ? u + ', ' : u + '}'
                    )
                    .join()
            )
        } else if (operation === 'remove') {
            let hasSeen = false
            annotationsActuallyMerged.forEach((mi, k) => {
                // if(fieldChanging && fieldChanging === 'annotation') {
                const anno = annotations.find((a) => a.id === k)
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
    const renderNewAnnotationContent = (): React.ReactElement => {
        const annotationSplitOnNewline = newAnnotation.annotation.split('\n')
        return (
            <div className={styles['AnnoContentContainer']}>
                {annotationSplitOnNewline.map((annotation) => {
                    const split: string[] = annotation.split(' said:')
                    const info: string = split[0] + ' said:' // since split isn't inclusive have to add it back in ! stupid !
                    const formattedInfo = (
                        <span className={styles['QuoteInfo']}>{info}</span>
                    )
                    return (
                        <>
                            {formattedInfo}
                            <div className={styles['bq']}>{split[1]}</div>
                        </>
                    )
                })}
            </div>
        )
    }

    const removeAnchorFromMergeAnnotation = (
        anchorId: string,
        annoId: string
    ) => {
        setNewAnnotation(
            buildAnnotation({
                ...newAnnotation,
                anchors: newAnnotation.anchors.filter(
                    (a) => a.anchorId !== anchorId
                ),
            })
        )
        const annosToUpdate = annotationsActuallyMerged
            .get(annoId)
            .anchors.find((a) => a.anchorId === anchorId).hasDuplicates

        if (annosToUpdate.length) {
            annosToUpdate.forEach((a) => {
                setAnnotationsActuallyMerged(
                    new Map(
                        annotationsActuallyMerged.set(a.annoId, {
                            ...annotationsActuallyMerged.get(a.annoId),
                            anchors: annotationsActuallyMerged
                                .get(a.annoId)
                                .anchors.filter(
                                    (anchId) => a.anchorId !== anchId.anchorId
                                ),
                        })
                    )
                )
            })
        }
        setAnnotationsActuallyMerged(
            new Map(
                annotationsActuallyMerged.set(annoId, {
                    ...annotationsActuallyMerged.get(annoId),
                    anchors: annotationsActuallyMerged
                        .get(annoId)
                        .anchors.filter(
                            (anchId) => anchorId !== anchId.anchorId
                        ),
                })
            )
        )
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
                                <>
                                    <Checkbox
                                        // onChange={
                                        // getAllAnnotation
                                        //     ? getAllAnnotationContent()
                                        //     : removeAllAnnotationContent()
                                        // }
                                        inputProps={{
                                            'aria-label': 'controlled',
                                        }}
                                        checked={getAllAnnotation}
                                    />
                                    Add all annotation body?
                                </>
                                <>
                                    <Checkbox
                                        // onChange={
                                        // getAllReplies
                                        //     ? getAllReplyContent()
                                        //     : removeAllReplyContent()
                                        // }
                                        inputProps={{
                                            'aria-label': 'controlled',
                                        }}
                                        checked={getAllReplies}
                                    />
                                    Add all replies?
                                </>
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
                                        alreadySelectedAnchors={
                                            map
                                                ? map.anchors.map(
                                                      (a) => a.anchorId
                                                  )
                                                : []
                                        }
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
