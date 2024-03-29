/*
 *
 * annotationReference.tsx
 * Component that's rendered when the user is authoring a new annotation.
 *
 */
import { useMediaQuery } from '@material-ui/core'
import { Checkbox, Tooltip } from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import * as React from 'react'
import { breakpoints } from '../utils/viewUtils'
import { createTheme } from '@mui/material/styles'
import cn from 'classnames'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
} from '../styles/vscodeStyles'
import styles from '../styles/annotation.module.css'
import anchorStyles from '../styles/versions.module.css'
import {
    AnchorObject,
    Annotation,
    MergeInformation,
} from '../../../constants/constants'
import ReplyContainer from './annotationComponents/replyContainer'
import { PastVersion } from './annotationComponents/pastVersions'
import { createAnchorOnCommitFromAnchorObject } from './annotationComponents/anchorCarousel'

interface Props {
    annotation: Annotation
    partSelected: (type: string, object: any) => void
    scrollWithRangeAndFile: (e: React.SyntheticEvent, anchorId: string) => void
    removeAnchorFromMergeAnnotation: (anchorId: string, annoId: string) => void
    annoNum: number
    // alreadySelectedAnchors: string[]
    mergeInformation: MergeInformation
}

const AnnotationReference: React.FC<Props> = ({
    annotation,
    partSelected,
    scrollWithRangeAndFile,
    removeAnchorFromMergeAnnotation,
    annoNum,
    mergeInformation,
    // alreadySelectedAnchors,
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
    const [localMergeInformation, setLocalMergeInformation] =
        React.useState<MergeInformation>(mergeInformation)

    React.useEffect(() => {
        setLocalMergeInformation(mergeInformation)
    }, [mergeInformation])

    const isAnchorAlreadySelected = (anchorId: string): boolean => {
        return (
            localMergeInformation &&
            localMergeInformation.anchors &&
            localMergeInformation.anchors
                .map((a) => a.anchorId)
                .includes(anchorId)
        )
    }

    const isAnnotationTextAlreadySelected = (): boolean => {
        return (
            localMergeInformation !== undefined &&
            localMergeInformation.annotation !== undefined &&
            localMergeInformation.annotation.length > 0
        )
    }

    const isMedOrMore = useMediaQuery(theme.breakpoints.up('md'))

    // const handleClick = (): void => {
    //     console.log('SELECTED')
    // }

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
        const selectedText = document?.getSelection()?.toString()
        if (selectedText && selectedText.length) {
            if (part === 'anchor') {
                if (anchorId && isAnchorAlreadySelected(anchorId)) return
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
                    const anchorTooltipText = isAnchorAlreadySelected(
                        anchor.anchorId
                    )
                        ? 'Remove anchor from merged annotation'
                        : 'Add anchor to merged annotation'
                    // consider bringing back prior versions in carousel view -- for now, not bothering
                    return (
                        <div
                            key={'merging-new-anchors-' + anchor.anchorId}
                            style={{ display: 'flex' }}
                        >
                            {isMedOrMore && (
                                <Tooltip title={anchorTooltipText}>
                                    <Checkbox
                                        // Needs work
                                        onChange={() =>
                                            isAnchorAlreadySelected(
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
                                        checked={
                                            isAnchorAlreadySelected(
                                                anchor.anchorId
                                            ) ?? false
                                        }
                                    />
                                </Tooltip>
                            )}
                            <div
                                id={anchor.parentId + '%' + anchor.anchorId}
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
                                    mergeSelection={isAnchorAlreadySelected(
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
                        {isAnnotationTextAlreadySelected() ? (
                            <Tooltip
                                title={
                                    'Remove text from merged annotation body'
                                }
                            >
                                <ArrowDownwardIcon
                                    onClick={bringBackAnnotation}
                                    style={{ cursor: 'pointer' }}
                                />
                            </Tooltip>
                        ) : (
                            <Tooltip
                                title={'Add text to merged annotation body'}
                            >
                                <ArrowUpwardIcon
                                    onClick={elevateAnnotation}
                                    style={{ cursor: 'pointer' }}
                                />
                            </Tooltip>
                        )}

                        <div
                            className={cn({
                                [styles['SelectableContainer']]: true,
                                [anchorStyles['disabled']]:
                                    isAnnotationTextAlreadySelected(),
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
                    mergeInformation={
                        mergeInformation?.replies
                            ? mergeInformation.replies
                            : []
                    }
                />
                {/* </CardContent>
                </Card>
            </ThemeProvider> */}
            </div>
        </>
    )
}

export default AnnotationReference
