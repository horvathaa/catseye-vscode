/*
 *
 * annotationList.tsx
 * Component that takes annotations and segments them into each list we currently support
 * including pinned, current file, and current project.
 *
 */
import {
    Annotation,
    AuthorOptions,
    FilterOptions,
    Option,
    OptionGroup,
    Reply,
    Scope,
} from '../../../constants/constants'
import {
    // getAllAnnotationFilenames,
    getAllAnnotationStableGitUrls,
    sortAnnotationsByLocation,
} from '../utils/viewUtils'
import ReactAnnotation from '../components/annotation'
import * as React from 'react'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import PushPinIcon from '@mui/icons-material/PushPin'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ArticleIcon from '@mui/icons-material/Article'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
} from '../styles/vscodeStyles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useState } from 'react'
import MassOperationsBar from './massOperationsBar'
import { StringifyOptions } from 'querystring'

interface AnnoListProps {
    title: string
    parentId: string
    annotations: Annotation[]
    vscode: any
    window: Window
    username: string
    userId: string
}

// NOTE: Currently types bar does not include "untyped" option
const AnnotationList: React.FC<AnnoListProps> = ({
    title,
    parentId,
    annotations,
    vscode,
    window,
    username,
    userId,
}) => {
    const [selectedAnnos, setSelectedAnnos] = useState<Annotation[]>([])
    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
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
            MuiList: {
                styleOverrides: {
                    root: {
                        backgroundColor: editorBackground,
                    },
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: {
                        color: iconColor,
                    },
                },
            },
        },
    })

    const annotationSelected = (anno: Annotation) => {
        let updatedSelectedAnnos: Annotation[]
        if (selectedAnnos.includes(anno)) {
            updatedSelectedAnnos = selectedAnnos.filter(
                (obj: Annotation) => obj !== anno
            )
        } else {
            // Can't mutate the types array like done previously!
            updatedSelectedAnnos = [anno].concat(selectedAnnos)
        }
        setSelectedAnnos(updatedSelectedAnnos)
    }

    console.log('annotationList tsx annotations', annotations)

    return (
        <>
            <ThemeProvider theme={theme}>
                <List sx={{ width: '100%' }} component="div" disablePadding>
                    {annotations.map((a: Annotation) => {
                        return (
                            <ReactAnnotation
                                key={`annotationList-${parentId}tsx-` + a.id}
                                annotation={a}
                                vscode={vscode}
                                window={window}
                                username={username}
                                userId={userId}
                                annotationSelected={annotationSelected}
                                annotations={annotations}
                            />
                        )
                    })}
                </List>
            </ThemeProvider>
        </>
    )
}

export default AnnotationList
