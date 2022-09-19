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
    Type,
    ReanchorInformation,
    Anchor,
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
import CatseyeButton from './annotationComponents/CatseyeButton'
import { useMediaQuery } from '@material-ui/core'
import { ColorTheme } from 'vscode'
// import AnnotationList from './annotationList'

interface Props {
    annotation: Annotation
    vscode: any
    window: Window
    username: string
    userId: string

    annotationSelected?: (anno: Annotation) => void
    annotations?: Annotation[] // Likely unnecessary
    selected?: boolean
    allowSelection?: boolean
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
    allowSelection = false,
}) => {
    const [anno, setAnno] = React.useState<Annotation>(annotation)
    const [expanded, setExpanded] = React.useState(false)
    const [edit, setEdit] = React.useState<boolean>(false)
    const [anchored, setAnchored] = React.useState(true)
    const [dynamicCardStyle, setDynamicCardStyle] = React.useState(cardStyle)

    const annoRef: React.MutableRefObject<Annotation> = React.useRef(anno)
    const tryingSomethingNew = 'rgb(48 47 47)'
    console.log('editorBackground', editorBackground)
    // MUI doesn't accept CSS version of this for some reason..?

    React.useEffect(() => {
        setAnno(annotation)
        setAnchored(annotation.anchors.some((a) => a.anchored))
    }, [annotation])

    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
                // main: `${tryingSomethingNew}`,
            },
            background: {
                paper: `${editorBackground}`,
                // paper: `${tryingSomethingNew}`,
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
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        // paddingLeft: 12,
                        // paddingRight: 12,
                        padding: 0,
                        ':last-child': {
                            paddingBottom: 0,
                        },
                    },
                },
            },
        },
        breakpoints: breakpoints,
    })

    React.useEffect(() => {
        if (!expanded) {
            setDynamicCardStyle({ ...cardStyle, paddingBottom: 10 })
        } else {
            setDynamicCardStyle({ ...cardStyle, paddingBottom: 0 })
        }
    }, [expanded])

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
            case 'scrollToAnno':
                const annoDiv: HTMLElement | null = document.getElementById(
                    message.payload.id
                )
                if (message.payload.id !== anno.id || !annoDiv) return
                !expanded && setExpanded(true)
                annoDiv.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                })
                return
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

    const scrollToRange = (
        anchor: Anchor,
        filename: string,
        gitUrl: string
    ): void => {
        vscode.postMessage({
            command: 'scrollToRange',
            anchor,
            filename,
            gitUrl,
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

    const requestManualReanchor = (oldAnchor: AnchorObject): void => {
        vscode.postMessage({
            command: 'manualReanchor',
            annoId: anno.id,
            oldAnchor,
        })
    }

    const submitReply = (reply: Reply): void => {
        const lastEditTime = new Date().getTime()
        const replyIds: string[] = anno.replies?.map((r) => r.id)
        const newReply = { ...reply, lastEditTime }

        // TODO: Here we should maybe sort by created and replacing instead of just concatenating
        const updatedReplies: Reply[] = replyIds.includes(reply.id)
            ? anno.replies.filter((r) => r.id !== reply.id).concat([newReply])
            : anno.replies.concat([newReply])
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            replies: updatedReplies,
            lastEditTime,
        })
        console.log('is this being called???', updatedReplies)
        setAnno(newAnno)
        annoRef.current = newAnno
        vscode.postMessage({
            command: 'updateAnnotation',
            annoId: anno.id,
            key: 'replies',
            value: updatedReplies,
        })
        // consider notifying annotation list that this value changed
    }

    const deleteReply = (id: string): void => {
        const lastEditTime = new Date().getTime()
        const updatedReply = {
            ...anno.replies.filter((r) => r.id === id)[0],
            deleted: true,
            lastEditTime,
        }
        const updatedReplies = anno.replies
            .filter((r) => r.id !== id)
            .concat([updatedReply])
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            replies: updatedReplies,
            lastEditTime,
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

    const updateAnnotationTypes = (types: Type[]): void => {
        const updatedTypes = types
        const newAnno: Annotation = buildAnnotation({
            ...anno,
            type: updatedTypes,
            lastEditTime: new Date().getTime(),
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
            lastEditTime: new Date().getTime(),
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
                {isMedOrMore && allowSelection && (
                    <Checkbox
                        checked={selected}
                        onChange={() =>
                            annotationSelected && annotationSelected(anno)
                        }
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                )}
                <Card style={dynamicCardStyle}>
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
                        <CardContent style={{ padding: 0 }}>
                            <AnchorVersions
                                anchors={anno.anchors}
                                scrollInEditor={scrollInEditor}
                                requestReanchor={requestReanchor}
                                scrollToRange={scrollToRange}
                                requestManualReanchor={requestManualReanchor}
                            />
                            <div className={styles['ContentContainer']}>
                                {edit ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <AnnotationTypesBar
                                            currentTypes={anno.types}
                                            editTypes={updateAnnotationTypes}
                                        />
                                        <TextEditor
                                            content={anno.annotation}
                                            submissionHandler={updateContent}
                                            cancelHandler={cancelAnnotation}
                                            showSplitButton={true}
                                            placeholder={'Add annotation text'}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
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
                                            <CatseyeButton
                                                buttonClicked={(
                                                    e: React.SyntheticEvent
                                                ) => {
                                                    e.stopPropagation()
                                                    setEdit(!edit)
                                                }}
                                                name="Edit Text"
                                                noMargin={true}
                                                icon={
                                                    <EditIcon fontSize="small" />
                                                }
                                            />
                                        </div>
                                        {anno.annotation.trim().length > 0 ? (
                                            <pre
                                                className={
                                                    styles[
                                                        'AnnoContentContainer'
                                                    ]
                                                }
                                            >
                                                {anno.annotation.trim()}
                                            </pre>
                                        ) : null}
                                    </div>
                                )}
                                <ReplyContainer
                                    replying={true}
                                    replies={anno.replies}
                                    username={username}
                                    userId={userId}
                                    submitReply={submitReply}
                                    cancelReply={() => {}}
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
