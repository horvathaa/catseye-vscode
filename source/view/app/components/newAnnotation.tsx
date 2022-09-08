/*
 *
 * newAnnotation.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent } from '@material-ui/core'
import * as React from 'react'

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
import AnchorIcon from '@mui/icons-material/Anchor'
import CatseyeButton from './annotationComponents/CatseyeButton'
import { PastVersion } from './annotationComponents/pastVersions'
import { AnchorObject, Type } from '../../../constants/constants'
import { createAnchorOnCommitFromAnchorObject } from './annotationComponents/anchorCarousel'

interface Props {
    anchorObject: AnchorObject
    vscode: any
    notifyDone: () => void
}

const NewAnnotation: React.FC<Props> = ({
    anchorObject,
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

    const scrollWithRangeAndFile = (e: React.SyntheticEvent): void => {
        e.stopPropagation()
        vscode.postMessage({
            command: 'scrollWithRangeAndFile',
            anchor: anchorObject.anchor,
            gitUrl: anchorObject.stableGitUrl,
        })
    }

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
        //     annoId: id,
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
                        {/* <Syntax html={selection} /> */}
                        <PastVersion
                            handleClick={scrollWithRangeAndFile}
                            i={0}
                            pastVersion={createAnchorOnCommitFromAnchorObject(
                                anchorObject
                            )}
                        />

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
                                <CatseyeButton
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
                                focus={true}
                                placeholder={'Add annotation text'}
                            />
                        </div>
                    </CardContent>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default NewAnnotation
