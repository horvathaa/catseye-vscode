/*
 *
 * newAnnotation.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent, useMediaQuery } from '@material-ui/core'
import List from '@mui/material/List'
import * as React from 'react'
import annoStyles from '../styles/annotation.module.css'
import TextEditor from './annotationComponents/textEditor'
import {
    breakpoints,
    buildAnnotation,
    buildEmptyAnnotation,
} from '../utils/viewUtils'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
    cardStyle,
} from '../styles/vscodeStyles'
import styles from '../styles/annotation.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import {
    AnchorObject,
    Annotation,
    Reply,
    Type,
} from '../../../constants/constants'
import AdamiteButton from './annotationComponents/AdamiteButton'
import AnchorIcon from '@mui/icons-material/Anchor'
import ReplyContainer from './annotationComponents/replyContainer'
import ReactAnnotation from './annotation'
import AnnotationReference from './annotationReference'

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
                setNewAnnotation(
                    buildAnnotation({
                        ...newAnnotation,
                        annotation:
                            annotation !== ''
                                ? annotation + '\n' + object
                                : object,
                    })
                )
                break
            case 'anchor':
                // would be better to use text in order to grab subset of anchor
                // could use tokenization that we use for reanchoring to create offset tokens
                const { anchorId, annotationId, text } = object
                const anchorToCopy = annotations
                    .find((a) => a.id === annotationId)
                    .anchors.find((a) => a.anchorId === anchorId)
                setNewAnnotation(
                    buildAnnotation({
                        ...newAnnotation,
                        anchors: newAnnotation.anchors.concat(anchorToCopy),
                    })
                )
                break
        }
    }

    const renderNewAnnotationContent = (): React.ReactElement => {
        const annotationSplitOnNewline = newAnnotation.annotation.split('\n')
        return (
            <div>
                {annotationSplitOnNewline.map((annotation) => {
                    return (
                        <div className={styles['AnnoContentContainer']}>
                            {annotation}
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderAnchors = (): React.ReactElement => {
        return (
            <div>
                {newAnnotation.anchors.map((a) => {
                    const anchorTextSplitOnNewline = a.anchorText.split('\n')
                    return (
                        <div>
                            {' '}
                            {anchorTextSplitOnNewline.map((t) => {
                                return <pre>{t}</pre>
                            })}{' '}
                        </div>
                    )
                })}
            </div>
        )
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
                                replies={replies}
                                username={username}
                                userId={userId}
                                submitReply={submitReply}
                                cancelReply={() => {}}
                                deleteReply={deleteReply}
                                focus={false}
                            />
                        </div>
                    </CardContent>
                    <List sx={{ width: '100%' }} component="div" disablePadding>
                        {annotations.map((a: Annotation) => {
                            return (
                                <AnnotationReference
                                    key={`merge-tsx-` + a.id}
                                    annotation={a}
                                    partSelected={partSelected}
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
