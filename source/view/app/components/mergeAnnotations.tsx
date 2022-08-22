/*
 *
 * newAnnotation.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent, useMediaQuery } from '@material-ui/core'
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
    const [newAnnotation, setNewAnnotation] = React.useState<Annotation>(
        buildEmptyAnnotation()
    )
    const [annotationsActuallyMerged, setAnnotationsActuallyMerged] =
        React.useState<Map<string, MergeInformation>>(new Map())
    const [duplicateBundles, setDuplicateBundles] = React.useState<DB>(null)

    const [types, setTypes] = React.useState<Type[]>([])
    const [replies, setReplies] = React.useState<Reply[]>([])
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
    }, [annotations])

    // React.useEffect(() => {}, [newAnnotation.anchors])

    const handleIncomingMessages = (e: MessageEvent<any>): void => {
        const message = e.data
        switch (message.command) {
            case 'receiveAnchors': {
                const { anchors, removedAnchorIds, usedAnnoIds } =
                    message.payload
                const removedAnchorIdsOnly = removedAnchorIds.map(
                    (a) => a.anchorId
                )
                let db: DB = {}
                setNewAnnotation(buildAnnotation({ ...newAnnotation, anchors }))

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
                                            h.anchorIds.includes(a.anchorId) &&
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
        console.log('We should add an anchor using the specified methods here!')
        // vscode.postMessage({
        //     command: 'addAnchor',
        //     annoId: id,
        // })
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
        switch (type) {
            case 'annotation':
                const { annotation } = newAnnotation
                const { selectedAnnotation, githubUsername, annoId } = object
                const newAnnotationContent =
                    annotation !== ''
                        ? `${annotation} \n${githubUsername} said: ${selectedAnnotation}`
                        : `${githubUsername} said: ${selectedAnnotation}`
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
                if (
                    newAnnotation.replies.map((r) => r.id).includes(object.id)
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
                } else {
                    const { annoId, ...rest } = object
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
                    ) // TODO: add UI to move reply content up to main anno body
                    // add CSS to make more clear if the reply has been selected or not
                }
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
                            className={`${anchorStyles['AnchorContainer']} ${anchorStyles['Suggestion']}`}
                            key={
                                a.anchorId +
                                a.parentId +
                                i +
                                'merge-anchor-list'
                            }
                        >
                            <PastVersion
                                pastVersion={pseudoAnchorOnCommit}
                                handleClick={scrollWithRangeAndFile}
                                i={i}
                            />
                            <AdamiteButton
                                buttonClicked={() =>
                                    removeAnchorFromMergeAnnotation(
                                        a.anchorId,
                                        a.parentId
                                    )
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
                                New Annotation
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
                                <AdamiteButton
                                    buttonClicked={addAnchor}
                                    name="Add Anchor"
                                    icon={<AnchorIcon fontSize="small" />}
                                />
                            </div>
                            {newAnnotation.anchors.length > 0
                                ? renderAnchors()
                                : null}
                            {newAnnotation.annotation !== ''
                                ? renderNewAnnotationContent()
                                : null}
                            <TextEditor
                                content={''}
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
                    <List sx={{ width: '100%' }} component="div" disablePadding>
                        {annotations.map((a: Annotation, i: number) => {
                            const map = annotationsActuallyMerged.get(a.id)
                            return (
                                <AnnotationReference
                                    key={`merge-tsx-` + a.id}
                                    annotation={a}
                                    alreadySelectedAnchors={
                                        map
                                            ? map.anchors.map((a) => a.anchorId)
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
                            )
                        })}
                    </List>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default MergeAnnotations