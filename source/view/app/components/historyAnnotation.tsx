import * as React from 'react'
import {
    Annotation,
    isHistoryAnchorObject,
    Type,
} from '../../../constants/constants'
import { Card, CardContent, Collapse } from '@material-ui/core'
// import { Checkbox, useMediaQuery } from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CollapsedCardHeader from './annotationComponents/annotationCardHeader'
import { breakpoints, buildAnnotation } from '../utils/viewUtils'
import {
    deleteAnnotation,
    resolveAnnotation,
    pinAnnotation,
    shareAnnotation,
} from '../utils/viewUtilsTsx'
import styles from '../styles/annotation.module.css'
import {
    // codeColor,
    editorBackground,
    iconColor,
    vscodeTextColor,
    cardStyle,
} from '../styles/vscodeStyles'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import TextEditor from './annotationComponents/textEditor'
import CatseyeButton from './annotationComponents/CatseyeButton'
import EditIcon from '@mui/icons-material/Edit'
import { GitDiffCarousel } from './annotationComponents/gitDiffCarousel'

interface Props {
    annotation: Annotation
    vscode: any
    userId: string
}

const HistoryAnnotation: React.FC<Props> = ({ annotation, vscode, userId }) => {
    // const [dynamicCardStyle, setDynamicCardStyle] = React.useState(cardStyle)
    const [expanded, setExpanded] = React.useState(false)
    // const [anchored, setAnchored] = React.useState(true)
    const [edit, setEdit] = React.useState<boolean>(false)
    const [anno, setAnno] = React.useState<Annotation>(annotation)

    React.useEffect(() => {
        setAnno(annotation)
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

    // const isMedOrMore = useMediaQuery(theme.breakpoints.up('md'))

    const addAnchor = (): void => {
        vscode.postMessage({
            command: 'addAnchor',
            annoId: anno.id,
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
        // annoRef.current = newAnno
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
        // annoRef.current = newAnno
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
                {/* {isMedOrMore && allowSelection && (
                    <Checkbox
                        checked={selected}
                        onChange={() =>
                            annotationSelected && annotationSelected(anno)
                        }
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                )} */}
                <Card style={cardStyle}>
                    <CollapsedCardHeader
                        expanded={expanded}
                        setExpanded={setExpanded}
                        // anchored={anchored}
                        userId={userId}
                        anchored={true}
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
                            {anno.anchors.map((a) => {
                                if (isHistoryAnchorObject(a)) {
                                    return (
                                        <GitDiffCarousel
                                            key={
                                                'carousel' +
                                                a.parentId +
                                                a.anchorId +
                                                a.gitDiffPast[0].simpleGit.refs
                                            }
                                            gitDiffPast={a.gitDiffPast}
                                            annoId={a.parentId}
                                            anchorId={a.anchorId}
                                        />
                                    )
                                }
                                return null
                            })}

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
                                {/* <ReplyContainer
                                    replying={true}
                                    replies={anno.replies}
                                    username={username}
                                    userId={userId}
                                    submitReply={submitReply}
                                    cancelReply={() => {}}
                                    deleteReply={deleteReply}
                                /> */}
                            </div>
                        </CardContent>
                    </Collapse>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default HistoryAnnotation
