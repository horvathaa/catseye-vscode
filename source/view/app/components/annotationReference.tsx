/*
 *
 * annotationReference.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { Card, CardContent, List, useMediaQuery } from '@material-ui/core'
import { Checkbox } from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import * as React from 'react'
import annoStyles from '../styles/annotation.module.css'
import TextEditor from './annotationComponents/textEditor'
import { breakpoints } from '../utils/viewUtils'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import cn from 'classnames'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
    cardStyle,
} from '../styles/vscodeStyles'
import styles from '../styles/annotation.module.css'
import anchorStyles from '../styles/versions.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import {
    AnchorObject,
    Annotation,
    Reply,
    Type,
} from '../../../constants/constants'
import Carousel from 'react-material-ui-carousel'
import ReplyContainer from './annotationComponents/replyContainer'
import { PastVersion } from './annotationComponents/pastVersions'
import { createAnchorOnCommitFromAnchorObject } from './annotationComponents/anchorCarousel'

interface Props {
    annotation: Annotation
    partSelected: (type: string, object: any) => void
    scrollWithRangeAndFile: (e: React.SyntheticEvent, anchorId: string) => void
    removeAnchorFromMergeAnnotation: (anchorId: string, annoId: string) => void
    annoNum: number
    alreadySelectedAnchors: string[]
}

const AnnotationReference: React.FC<Props> = ({
    annotation,
    partSelected,
    scrollWithRangeAndFile,
    removeAnchorFromMergeAnnotation,
    annoNum,
    alreadySelectedAnchors,
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
    const [hasAnnotationTextBeenSelected, setHasAnnotationTextBeenSelected] =
        React.useState<boolean>(false)

    const isMedOrMore = useMediaQuery(theme.breakpoints.up('md'))

    const handleClick = (): void => {
        console.log('SELECTED')
    }

    const handleSelectReply = (
        id: string,
        operation: string,
        level?: string
    ): void => {
        const reply = annotation.replies.find((r) => r.id === id)
        const infoToPass = level
            ? { ...reply, annoId: annotation.id, operation, level }
            : { ...reply, annoId: annotation.id, operation }
        partSelected('reply', infoToPass)
    }

    const elevateAnnotation = () => {
        partSelected('annotation', {
            selectedAnnotation: annotation.annotation,
            githubUsername: annotation.githubUsername,
            annoId: annotation.id,
        })
        setHasAnnotationTextBeenSelected(true)
    }

    const bringBackAnnotation = () => {
        partSelected('annotation', {
            selectedAnnotation: annotation.annotation,
            githubUsername: annotation.githubUsername,
            annoId: annotation.id,
        })
        setHasAnnotationTextBeenSelected(false)
    }

    const handleMouseSelection = (
        event: React.MouseEvent,
        part: string,
        anchorId?: string,
        annotationId?: string,
        anchorText?: string
    ) => {
        event.stopPropagation()
        const selectedText = document?.getSelection().toString()
        if (selectedText.length) {
            if (part === 'anchor') {
                // const ids: string[] = (event.target as HTMLDivElement).id.split(
                //     '%'
                // )
                // console.log('ids?', ids)
                if (alreadySelectedAnchors.includes(anchorId)) return
                partSelected(part, {
                    anchorId,
                    annotationId,
                    text: selectedText,
                    anchorText: anchorText,
                })
            } else if (part === 'annotation') {
                if (!hasAnnotationTextBeenSelected) {
                    partSelected(part, {
                        selectedAnnotation: selectedText,
                        githubUsername: annotation.githubUsername,
                        annoId: annotation.id,
                    })
                    setHasAnnotationTextBeenSelected(true)
                }
            } // todo: add reply -- not sure why replies aren't showing up in curr build
        }
    }

    return (
        <>
            <p className={anchorStyles['SuggestionTitle']}>
                Annotation {annoNum}
            </p>
            <div>
                {annotation.anchors.map((anchor: AnchorObject, i) => {
                    // consider bringing back prior versions in carousel view -- for now, not bothering
                    return (
                        <div
                            key={'merging-new-anchors-' + anchor.anchorId}
                            style={{ display: 'flex' }}
                        >
                            {isMedOrMore && (
                                <Checkbox
                                    // Needs work
                                    onChange={() =>
                                        alreadySelectedAnchors.includes(
                                            anchor.anchorId
                                        )
                                            ? removeAnchorFromMergeAnnotation(
                                                  anchor.anchorId,
                                                  anchor.parentId
                                              )
                                            : partSelected('anchor', anchor)
                                    }
                                    inputProps={{
                                        'aria-label': 'controlled',
                                    }}
                                    checked={alreadySelectedAnchors.includes(
                                        anchor.anchorId
                                    )}
                                />
                            )}
                            <div
                                id={anchor.parentId + '%' + anchor.anchorId}
                                // className={cn({
                                //     // [anchorStyles['AnchorContainer']]: true,
                                //     [anchorStyles['MergedAnchorContainer']]: true,
                                //     [anchorStyles['Selected']]:
                                //         alreadySelectedAnchors.includes(
                                //             anchor.anchorId
                                //         ),
                                // })}
                                className={
                                    anchorStyles['MergedAnchorContainer']
                                }
                                onMouseUp={(e) =>
                                    handleMouseSelection(
                                        e,
                                        'anchor',
                                        anchor.anchorId,
                                        anchor.parentId,
                                        anchor.anchorText
                                    )
                                }
                            >
                                <PastVersion
                                    key={'anno-ref' + anchor.anchorId + i}
                                    handleClick={scrollWithRangeAndFile}
                                    i={i}
                                    pastVersion={createAnchorOnCommitFromAnchorObject(
                                        anchor
                                    )}
                                    mergeSelection={alreadySelectedAnchors.includes(
                                        anchor.anchorId
                                    )}
                                />
                            </div>
                        </div>
                    )
                })}
                {annotation.annotation.length ? (
                    <div
                        className={
                            styles['AnnotationContentAnnotationReference']
                        }
                    >
                        {hasAnnotationTextBeenSelected ? (
                            <ArrowDownwardIcon
                                onClick={bringBackAnnotation}
                                style={{ cursor: 'pointer' }}
                                // className={cn({
                                //     [anchorStyles['disabled']]:
                                //         hasAnnotationTextBeenSelected,
                                // })}
                            />
                        ) : (
                            <ArrowUpwardIcon
                                onClick={elevateAnnotation}
                                style={{ cursor: 'pointer' }}
                                // className={cn({
                                //     [anchorStyles['disabled']]:
                                //         hasAnnotationTextBeenSelected,
                                // })}
                            />
                        )}

                        <div
                            className={cn({
                                [styles['SelectableContainer']]: true,
                                [anchorStyles['disabled']]:
                                    hasAnnotationTextBeenSelected,
                            })}
                            // onMouseUp={(e) => handleMouseSelection(e, 'annotation')}
                        >
                            {annotation.annotation}
                        </div>
                    </div>
                ) : null}

                {/* To Include, Annotation types */}
                {/* Annotation text works differently. */}
                {/* Include replies as checkboxes, same with anchors */}
                <ReplyContainer
                    replying={false}
                    showCheckbox={true}
                    handleSelectReply={handleSelectReply}
                    replies={annotation.replies}
                    cancelReply={() => {}}
                    focus={false}
                />
                {/* </CardContent>
                </Card>
            </ThemeProvider> */}
            </div>
        </>
    )
}

export default AnnotationReference
