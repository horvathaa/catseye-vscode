/*
 *
 * anchorVersions.tsx
 * Component that renders all annotation anchors in carousel view if prior versions exists
 *
 */
import * as React from 'react'
import Slider from 'react-touch-drag-slider' //https://github.com/bushblade/react-touch-drag-slider
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { IconButton } from '@material-ui/core'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
    disabledIcon,
} from '../../styles/vscodeStyles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import '../../styles/versions.module.css'
import { AnchorObject, AnchorOnCommit } from '../../../../constants/constants'

interface Props {
    anchors: AnchorObject[]
}

const AnchorVersions: React.FC<Props> = ({ anchors }) => {
    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
            },
            background: {
                paper: `${editorBackground}`,
            },
            action: {
                disabled: `${disabledIcon}`,
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
            MuiSvgIcon: {
                styleOverrides: {
                    root: {
                        backgroundColor: editorBackground,
                        color: iconColor,
                    },
                },
            },
        },
    })

    const [index, setIndex] = React.useState(
        anchors[0].priorVersions.length - 1
    )
    const [showBack, setShowBack] = React.useState(false)
    const [showForward, setShowForward] = React.useState(false)
    const [priorVersions, setPriorVersions] = React.useState([])

    React.useEffect(() => {
        if (index > 0) {
            setShowBack(true)
        }
        if (index < anchors[0].priorVersions.length - 1) {
            setShowForward(true)
        }
        if (index === 0) {
            setShowBack(false)
        }
        if (index === anchors[0].priorVersions.length - 1) {
            setShowForward(false)
        }
    }, [index])

    React.useEffect(() => {
        if (anchors.length) {
            anchors[0].priorVersions.reverse()
            setPriorVersions(anchors[0].priorVersions)
        }
    }, [anchors])

    const forward = () => {
        if (index === anchors[0].priorVersions.length - 1) setShowForward(false)
        if (index < anchors[0].priorVersions.length - 1) {
            setIndex(index + 1)
            setShowBack(true)
        }
    }
    console.log('anchors', anchors)

    const back = () => {
        if (index === 1) setShowBack(false)
        if (index > 0) {
            setIndex(index - 1)
            setShowForward(true)
        }
    }
    return (
        <div>
            <ThemeProvider theme={theme}>
                {anchors.map((anchor: AnchorObject) => {
                    return (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                minWidth: 50,
                                height: 100,
                                border: '0.25px solid rgb(239 255 201 / 20%)',
                                padding: 'none',
                                margin: 'none',
                                boxSizing: 'border-box',
                            }}
                        >
                            {showBack ? (
                                <IconButton onClick={back}>
                                    <ArrowBackIcon />
                                </IconButton>
                            ) : null}
                            <Slider
                                onSlideComplete={(i) => {
                                    setIndex(i)
                                    console.log(
                                        'finished dragging, current slide is',
                                        i
                                    )
                                }}
                                onSlideStart={(i) => {
                                    console.log('started dragging on slide', i)
                                }}
                                activeIndex={index}
                                // threshHold={50}
                                transition={0.5}
                                scaleOnDrag={true}
                            >
                                {priorVersions.map(
                                    (pv: AnchorOnCommit, index) => (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                width: '100%',
                                                height: 100,
                                                color: iconColor,
                                            }}
                                            key={index}
                                        >
                                            <p>{pv.anchorText}</p>
                                            <span>
                                                {pv.branchName} :{' '}
                                                {pv.commitHash.slice(0, 6)}
                                            </span>
                                        </div>
                                    )
                                )}
                            </Slider>
                            {showForward ? (
                                <IconButton onClick={forward}>
                                    <ArrowForwardIcon />
                                </IconButton>
                            ) : null}
                        </div>
                    )
                })}
            </ThemeProvider>
        </div>
    )
}

export default AnchorVersions
