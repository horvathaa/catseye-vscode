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

const AnchorVersions: React.FC = () => {
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

    const anchors = [
        { text: 'hello', order: 0 },
        { text: 'you', order: 1 },
        { text: 'are', order: 2 },
        { text: 'great', order: 3 },
    ]

    const [index, setIndex] = React.useState(anchors.length - 1)
    const [showBack, setShowBack] = React.useState(false)
    const [showForward, setShowForward] = React.useState(false)

    React.useEffect(() => {
        if (index > 0) {
            setShowBack(true)
        }
        if (index < anchors.length - 1) {
            setShowForward(true)
        }
        if (index === 0) {
            setShowBack(false)
        }
        if (index === anchors.length - 1) {
            setShowForward(false)
        }
    }, [index])

    const forward = () => {
        if (index === anchors.length - 1) setShowForward(false)
        if (index < anchors.length - 1) {
            setIndex(index + 1)
            setShowBack(true)
        }
    }

    const back = () => {
        if (index === 1) setShowBack(false)
        if (index > 0) {
            setIndex(index - 1)
            setShowForward(true)
        }
    }
    return (
        <>
            <ThemeProvider theme={theme}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        minWidth: 50,
                        height: 200,
                        border: '0.25px solid rgb(239 255 201 / 20%)',
                        padding: 'none',
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
                        {anchors.map((a: any, index) => (
                            <div
                                style={{
                                    width: '100%',
                                    height: '200',
                                    backgroundColor: 'red',
                                    padding: 'none',
                                    margin: 'none',
                                }}
                                key={index}
                            >
                                {a.text}
                            </div>
                        ))}
                    </Slider>

                    {showForward ? (
                        <IconButton onClick={forward}>
                            <ArrowForwardIcon />
                        </IconButton>
                    ) : null}
                </div>
            </ThemeProvider>
        </>
    )
}

export default AnchorVersions
