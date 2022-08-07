/*
 *
 * newAnnotation.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent, useMediaQuery } from '@material-ui/core'
import * as React from 'react'
import annoStyles from '../styles/annotation.module.css'
import TextEditor from './annotationComponents/textEditor'
import { breakpoints } from '../utils/viewUtils'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
    cardStyle,
} from '../styles/vscodeStyles'
import styles from '../styles/annotation.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'

interface SynProps {
    html: string
}

const Syntax: React.FC<SynProps> = ({ html }) => {
    return <code dangerouslySetInnerHTML={{ __html: html }}></code>
}
interface Props {
    selection: string
    vscode: any
    notifyDone: () => void
}

const NewAnnotation: React.FC<Props> = ({
    selection,
    vscode,
    notifyDone = () => {},
}) => {
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

    const createAnnotation = (
        annoContent: string,
        shareWith: string | undefined,
        willBePinned: boolean | undefined
    ) => {
        notifyDone()
        vscode.postMessage({
            command: 'createAnnotation',
            anno: annoContent,
            shareWith,
            willBePinned,
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

    // return (
    //     <div className={annoStyles['Pad']}>
    //         <div
    //             className={annoStyles['AnnotationContainer']}
    //             id="NewAnnotation"
    //         >
    //             <Syntax html={selection} />
    //             <TextEditor
    //                 content={''}
    //                 submissionHandler={createAnnotation}
    //                 cancelHandler={cancelAnnotation}
    //                 showSplitButton={true}
    //             />
    //         </div>
    //     </div>
    // )
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
                        <Syntax html={selection} />
                        {/* <AnchorVersions
                            anchors={anno.anchors}
                            scrollInEditor={scrollInEditor}
                        /> */}
                        <div className={styles['ContentContainer']}>
                            <TextEditor
                                content={''}
                                submissionHandler={createAnnotation}
                                cancelHandler={cancelAnnotation}
                                showSplitButton={true}
                            />
                            <AnnotationTypesBar
                                currentTypes={anno.types}
                                editTypes={updateAnnotationTypes}
                            />
                        </div>
                        {/* <ReplyContainer
                                replying={replying}
                                replies={anno.replies}
                                username={username}
                                userId={userId}
                                submitReply={submitReply}
                                cancelReply={() => setReplying(false)}
                                deleteReply={deleteReply}
                            /> */}
                    </CardContent>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default NewAnnotation
