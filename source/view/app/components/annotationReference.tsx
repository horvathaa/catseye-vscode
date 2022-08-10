/*
 *
 * annotationReference.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent, List, useMediaQuery } from '@material-ui/core'
import { Checkbox } from '@mui/material'
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
import {
    AnchorObject,
    Annotation,
    Reply,
    Type,
} from '../../../constants/constants'
import { Carousel } from 'react-bootstrap'
import ReplyContainer from './annotationComponents/replyContainer'

interface Props {
    annotation: Annotation
    partSelected: (type: string, object: any) => void
}

const AnnotationReference: React.FC<Props> = ({ annotation, partSelected }) => {
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

    const handleClick = (): void => {
        console.log('SELECTED')
    }

    return (
        <div>
            <ThemeProvider theme={theme}>
                <Card className={styles['ContentContainer']}>
                    <CardContent>
                        Anchors
                        {annotation.anchors.map((anchor: AnchorObject, i) => {
                            console.log(anchor.anchorId)
                            anchor.priorVersions &&
                                anchor.priorVersions.reverse()
                            if (anchor.priorVersions) {
                                return (
                                    <div
                                        key={
                                            'reference-' +
                                            annotation.id +
                                            anchor.anchorId
                                        }
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                        }}
                                    >
                                        {isMedOrMore && (
                                            <Checkbox
                                                // Needs work
                                                onChange={() =>
                                                    partSelected(
                                                        'anchor',
                                                        anchor
                                                    )
                                                }
                                                inputProps={{
                                                    'aria-label': 'controlled',
                                                }}
                                            />
                                        )}
                                        <div
                                            key={
                                                'reference-' +
                                                annotation.id +
                                                anchor.anchorId
                                            }
                                            className={
                                                styles['AnchorContainer']
                                            }
                                            // style={{
                                            //     display: 'flex',
                                            //     flexDirection: 'column',
                                            //     alignItems: 'flex-start',
                                            //     width: '100%',
                                            //     padding: '10px',
                                            //     color: iconColor,
                                            // }} // same as AnchorContainer ^^
                                            onClick={(e) => {
                                                handleClick()
                                                // handleClick(
                                                //     e,
                                                //     anchor.anchorId
                                                // )
                                            }}
                                        >
                                            {anchor.anchorText}
                                        </div>
                                        {/* <Carousel
                                            key={i}
                                            priorVersions={anchor.priorVersions}
                                            currentAnchorObject={anchor}
                                            handleSelected={handleSelected}
                                        ></Carousel> */}
                                    </div>
                                )
                            }
                            return null
                            // if (!anchor.anchored) {
                            // return (
                            // put show/hide here
                            // )
                            // }
                            // return null
                        })}
                        <div className={styles['SelectableContainer']}>
                            {annotation.annotation}
                        </div>
                        {/* To Include, Annotation types */}
                        {/* Annotation text works differently. */}
                        {/* Include replies as checkboxes, same with anchors */}
                        <ReplyContainer
                            replying={false}
                            replies={annotation.replies}
                            cancelReply={() => {}}
                            focus={false}
                        />
                    </CardContent>
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default AnnotationReference
