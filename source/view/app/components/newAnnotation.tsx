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
import { Type } from '../../../constants/constants'
import AdamiteButton from './annotationComponents/AdamiteButton'
import AnchorIcon from '@mui/icons-material/Anchor'

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
    const [types, setTypes] = React.useState<Type[]>([])
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
            types,
        })
    }

    const updateAnnotationTypes = (newTypes: Type[]): void => {
        setTypes(newTypes)
    }

    const addAnchor = (): void => {
        console.log('We should add an anchor using the specified methods here!')
        // vscode.postMessage({
        //     command: 'addAnchor',
        //     annoId: anno.id,
        // })
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
                        <Syntax html={selection} />

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

                            <TextEditor
                                content={''}
                                submissionHandler={createAnnotation}
                                cancelHandler={cancelAnnotation}
                                showSplitButton={true}
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
