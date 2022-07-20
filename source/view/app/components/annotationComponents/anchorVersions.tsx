/*
 *
 * anchorVersions.tsx
 * Component that renders all annotation anchors in a carousel view - swipable if prior versions exists
 *
 */
import * as React from 'react'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
    disabledIcon,
} from '../../styles/vscodeStyles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import '../../styles/versions.module.css'
import { AnchorObject } from '../../../../constants/constants'
import Carousel from './anchorCarousel'

interface Props {
    anchors: AnchorObject[]
    scrollInEditor: (id: string) => void
}

const AnchorVersions: React.FC<Props> = ({ anchors, scrollInEditor }) => {
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

    console.log('anchors', anchors)

    return (
        <div>
            {/* <ThemeProvider theme={theme}> */}
            {anchors.map((anchor: AnchorObject, i) => {
                anchor && anchor.priorVersions.reverse()
                return (
                    <Carousel
                        key={i}
                        priorVersions={anchor.priorVersions}
                        currentAnchorObject={anchor}
                        scrollInEditor={scrollInEditor}
                    ></Carousel>
                )
            })}
            {/* </ThemeProvider> */}
        </div>
    )
}

export default AnchorVersions
