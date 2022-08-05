/*
 *
 * annotation.tsx
 * Main annotation component and associated functionality/listeners.
 * Components the annotation renders are in annotationComponents/
 */
import * as React from 'react'
// import cn from 'classnames'
import { breakpoints, buildAnnotation } from '../utils/viewUtils'
import {
    deleteAnnotation,
    resolveAnnotation,
    pinAnnotation,
    shareAnnotation,
} from '../utils/viewUtilsTsx'
import styles from '../styles/annotation.module.css'
import {
    Annotation,
    AnchorObject,
    Reply,
    Snapshot,
    Type,
    ReanchorInformation,
} from '../../../constants/constants'
// import AnnotationOperationButtons from './annotationComponents/annotationOperationButtons'
// import AnchorList from './annotationComponents/anchorList'
import AnchorVersions from './annotationComponents/anchorVersions'
import TextEditor from './annotationComponents/textEditor'
import ReplyContainer from './annotationComponents/replyContainer'
// import Outputs from './annotationComponents/outputs'
// import ReplyIcon from '@mui/icons-material/Reply'
// import Snapshots from './annotationComponents/snapshots'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import { Card, CardContent, Collapse } from '@material-ui/core'
import { Checkbox } from '@mui/material'
import {
    // codeColor,
    editorBackground,
    iconColor,
    vscodeTextColor,
    cardStyle,
} from '../styles/vscodeStyles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CollapsedCardHeader from './annotationComponents/annotationCardHeader'
import EditIcon from '@mui/icons-material/Edit'
import AdamiteButton from './annotationComponents/AdamiteButton'
import { useMediaQuery } from '@material-ui/core'
// import AnnotationList from './annotationList'

interface Props {
    annotation: Annotation
    vscode: any
    window: Window
    username: string
    userId: string
    annotationSelected: (anno: Annotation) => void
    annotations: Annotation[] // Likely unnecessary
    selected: boolean
}

// TODO: Add Pin button next to edit
const ReactAnnotation: React.FC<Props> = ({
    annotation,
    vscode,
    window,
    username,
    userId,
    annotationSelected,
    annotations,
    selected,
}) => {
    const [anno, setAnno] = React.useState<Annotation>(annotation)
    const [expanded, setExpanded] = React.useState(false)
    const [edit, setEdit] = React.useState<boolean>(false)
    const [replying, setReplying] = React.useState<boolean>(false)
    const [anchored, setAnchored] = React.useState(true) // change later

    const annoRef: React.MutableRefObject<Annotation> = React.useRef(anno)

    // MUI doesn't accept CSS version of this for some reason..?

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

    const isMedOrMore = useMediaQuery(theme.breakpoints.up('md'))

    // const handleExpandClick = () => {
    //     setExpanded(!expanded)
    // }

    const handleIncomingMessages = (e: MessageEvent<any>) => {
        const message = e.data
        switch (message.command) {
            case 'newHtml':
                const { html, anchorText, anchorPreview, id, anchorId } =
                    message.payload
                if (id === anno.id) {
                    const oldAnchorObject: AnchorObject | undefined =
                        anno.anchors.find((a) => a.anchorId === anchorId)
                    if (oldAnchorObject) {
                        const newAnchorList: AnchorObject[] = [
                            ...anno.anchors.filter(
                                (a) => a.anchorId !== anchorId
                            ),
                            {
                                ...oldAnchorObject,
                                html: html,
                                anchorText: anchorText,
                                anchorPreview: anchorPreview,
                            },
                        ]
                        const newAnno: Annotation = buildAnnotation({
                            ...anno,
                            anchors: newAnchorList,
                        })
                        annoRef.current = newAnno
                        setAnno(newAnno)
                    }
                }
                break
        }
    }

    React.useEffect(() => {
        window.addEventListener('message', handleIncomingMessages)
        return () => {
            window.removeEventListener('message', handleIncomingMessages)
        }
    }, [])

    React.useEffect(() => {
        const newAnno: Annotation = buildAnnotation(annotation)
        setAnno(newAnno)
        annoRef.current = newAnno
    }, [annotation])

    React.useEffect(() => {}, [userId])

    const scrollInEditor = (id: string): void => {
        vscode.postMessage({
            command: 'scrollInEditor',
            id: anno.id,
            anchorId: id,
        })
    }

    const handlePinnedClick = (): void => {
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'selected',
            value: !anno.selected,
        })
    }

    const exportAnnotationAsComment = (): void => {
        vscode.postMessage({
            command: 'exportAnnotationAsComment',
            annoId: anno.id,
        })
    }

    const requestReanchor = (newAnchor: ReanchorInformation): void => {
        vscode.postMessage({
            command: 'reanchor',
            annoId: anno.id,
            newAnchor,
        })
    }

    const addAnchor = (): void => {
        vscode.postMessage({
            command: 'addAnchor',
            annoId: anno.id,
        })
    }
    const snapshotCode = (id: string): void => {
        vscode.postMessage({
            command: 'snapshotCode',
            annoId: anno.id,
            anchorId: id,
        })
        const anchor: AnchorObject | undefined = anno.anchors.find(
            (a) => a.anchorId === id
        )
        if (!anchor) {
            console.error('could not find anchor - leaving annotation as is')
            return
        }
        const newSnapshots: Snapshot[] = anno.codeSnapshots
            ? anno.codeSnapshots.concat([
                  {
                      createdTimestamp: new Date().getTime(),
                      snapshot: anchor.html,
                      anchorText: anchor.anchorText,
                      anchorId: anchor.anchorId,
                      githubUsername: username,
                      comment: '',
                      id: '',
                      diff: '',
                      deleted: false,
                  },
              ])
            : [
                  {
                      createdTimestamp: new Date().getTime(),
                      snapshot: anchor.html,
                      anchorText: anchor.anchorText,
                      anchorId: anchor.anchorId,
                      githubUsername: username,
                      comment: '',
                      id: '',
                      diff: '',
                      deleted: false,
                  },
              ]
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            codeSnapshots: newSnapshots,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
    }

    const submitReply = (reply: Reply): void => {
        const replyIds: string[] = anno.replies?.map((r) => r.id)
        // TODO: Here we should maybe sort by created and replacing instead of just concatenating
        const updatedReplies: Reply[] = replyIds.includes(reply.id)
            ? anno.replies.filter((r) => r.id !== reply.id).concat([reply])
            : anno.replies.concat([reply])
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            replies: updatedReplies,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'replies',
            value: updatedReplies,
        })
        setReplying(false)
        // TODO: End of this function should result to clearing of annotation
    }

    const deleteReply = (id: string): void => {
        const updatedReply = {
            ...anno.replies.filter((r) => r.id === id)[0],
            deleted: true,
        }
        const updatedReplies = anno.replies
            .filter((r) => r.id !== id)
            .concat([updatedReply])
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            replies: updatedReplies,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'replies',
            value: updatedReplies,
        })
    }

    const submitSnapshot = (snapshot: Snapshot): void => {
        const updatedSnapshots: Snapshot[] = anno.codeSnapshots.map(
            (s: Snapshot) => {
                return s.id === snapshot.id ? snapshot : s
            }
        )
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            codeSnapshots: updatedSnapshots,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'codeSnapshots',
            value: updatedSnapshots,
        })
    }

    const deleteSnapshot = (id: string): void => {
        if (!id || id === '') {
            console.error('Could not find snapshot.')
            return
        }
        const updatedSnapshots = anno.codeSnapshots.map((s: Snapshot) => {
            return s.id === id ? { ...s, deleted: true } : s
        })

        const newAnno: Annotation = buildAnnotation({
            ...anno,
            codeSnapshots: updatedSnapshots,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'codeSnapshots',
            value: updatedSnapshots,
        })
    }

    const updateAnnotationTypes = (types: Type[]): void => {
        const updatedTypes = types
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            type: updatedTypes,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'types',
            value: updatedTypes,
        })
    }

    const updateContent = (
        newAnnoContent: string,
        shareWith: string | undefined
    ): void => {
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            annotation: newAnnoContent,
            shareWith,
        })
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: ['annotation', 'sharedWith'],
            value: { annotation: newAnnoContent, sharedWith: shareWith },
        })
        setEdit(false)
    }

    const cancelAnnotation = (): void => {
        setEdit(false)
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
            }}
            id={anno.id}
        >
            <ThemeProvider theme={theme}>
                {isMedOrMore && (
                    <Checkbox
                        checked={selected}
                        onChange={() => annotationSelected(anno)}
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                )}
                <Card style={cardStyle}>
                    <CollapsedCardHeader
                        expanded={expanded}
                        setExpanded={setExpanded}
                        anchored={anchored}
                        anno={anno}
                        deleteAnnotation={(e) =>
                            deleteAnnotation(e, vscode, anno)
                        }
                        resolveAnnotation={(e) =>
                            resolveAnnotation(e, vscode, anno)
                        }
                        pinAnnotation={(e) => pinAnnotation(e, vscode, anno)}
                        shareAnnotation={(e) =>
                            shareAnnotation(e, vscode, anno)
                        }
                        addAnchor={addAnchor}
                    />
                    <Collapse
                        in={expanded}
                        timeout="auto"
                        //unmountOnExit
                    >
                        <CardContent>
                            <AnchorVersions
                                anchors={anno.anchors}
                                scrollInEditor={scrollInEditor}
                                requestReanchor={requestReanchor}
                            />
                            <div className={styles['ContentContainer']}>
                                {edit ? (
                                    <TextEditor
                                        content={anno.annotation}
                                        submissionHandler={updateContent}
                                        cancelHandler={cancelAnnotation}
                                        showSplitButton={true}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <div
                                            className={
                                                styles['AnnoContentContainer']
                                            }
                                        >
                                            {anno.annotation}
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <AnnotationTypesBar
                                                currentTypes={anno.types}
                                                editTypes={
                                                    updateAnnotationTypes
                                                }
                                            />
                                            <AdamiteButton
                                                buttonClicked={(
                                                    e: React.SyntheticEvent
                                                ) => {
                                                    e.stopPropagation()
                                                    setEdit(!edit)
                                                }}
                                                name="Edit"
                                                noMargin={true}
                                                icon={
                                                    <EditIcon fontSize="small" />
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                                <ReplyContainer
                                    replying={replying}
                                    replies={anno.replies}
                                    username={username}
                                    userId={userId}
                                    submitReply={submitReply}
                                    cancelReply={() => setReplying(false)}
                                    deleteReply={deleteReply}
                                />
                            </div>
                        </CardContent>
                    </Collapse>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default ReactAnnotation
