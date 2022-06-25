/*
 *
 * annotationList.tsx
 * Component that takes annotations and segments them into each list we currently support
 * including pinned, current file, and current project.
 *
 */
import { Annotation } from '../../../constants/constants'
import {
    // getAllAnnotationFilenames,
    getAllAnnotationStableGitUrls,
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
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
} from '../styles/vscodeStyles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useState } from 'react'

interface AnnoListProps {
    annotations: Annotation[]
    vscode: any
    window: Window
    currentFile: string
    currentProject: string
    username: string
    userId: string
}

const AnnotationList: React.FC<AnnoListProps> = ({
    annotations,
    vscode,
    window,
    currentFile,
    currentProject,
    username,
    userId,
}) => {
    const [openPinned, setOpenPinned] = useState(false)
    const [openCurrProj, setCurrProj] = useState(false)
    const [pinnedAnno, setPinnedAnno] = useState<any[]>([])
    const [fileAnno, setFileAnno] = useState<any[]>([])
    const [projAnno, setProjAnno] = useState<any[]>([])

    const handlePinClick = () => {
        setOpenPinned(!openPinned)
    }
    const handleCurrProjClick = () => {
        setCurrProj(!openCurrProj)
    }

    React.useEffect(() => {
        if (annotations.length) {
            displayAnnotations()
        }
    }, [annotations]) // annotations state set in adamite.tsx

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

    const getAnnotations = (): { [key: string]: any } => {
        const output: { [key: string]: any } = {
            Pinned: [],
            'Current File': [],
            'Current Project': [],
        }
        annotations.forEach((a: Annotation) => {
            const annoFiles = getAllAnnotationStableGitUrls(a)
            if (a.selected) {
                output['Pinned'].push(a)
            } else if (annoFiles.includes(currentFile)) {
                output['Current File'].push(a)
            } else if (a.projectName === currentProject) {
                output['Current Project'].push(a) // only pulls annotations since last commit?
            }
        })
        return output
    }

    const displayAnnotations = () => {
        const groupings = getAnnotations()
        Object.keys(groupings).forEach((group) => {
            let annot = groupings[group]
            if (group === 'Pinned') {
                setPinnedAnno(annot)
            }
            if (group === 'Current File') {
                setFileAnno(annot)
            }
            if (group === 'Current Project') {
                setProjAnno(annot)
            }
        })
    }

    return (
        <>
            <ThemeProvider theme={theme}>
                <List sx={{ width: '100%' }} component="nav">
                    <ListItemButton onClick={handlePinClick}>
                        <ListItemIcon>
                            <PushPinIcon />
                        </ListItemIcon>
                        <ListItemText primary="Pinned" />
                        {openPinned ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={openPinned} timeout="auto" unmountOnExit>
                        {pinnedAnno.length > 0 &&
                            pinnedAnno.map((a: Annotation) => {
                                return (
                                    <ReactAnnotation
                                        key={'annotationList-tsx-' + a.id}
                                        annotation={a}
                                        vscode={vscode}
                                        window={window}
                                        username={username}
                                        userId={userId}
                                    />
                                )
                            })}
                    </Collapse>
                    {fileAnno.length > 0 &&
                        fileAnno.map((a: Annotation) => {
                            return (
                                <ReactAnnotation
                                    key={'annotationList-tsx-' + a.id}
                                    annotation={a}
                                    vscode={vscode}
                                    window={window}
                                    username={username}
                                    userId={userId}
                                />
                            )
                        })}
                    <ListItemButton onClick={handleCurrProjClick}>
                        <ListItemIcon>
                            <AccountTreeIcon />
                        </ListItemIcon>
                        <ListItemText primary="Current Project" />
                        {openCurrProj ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={openCurrProj} timeout="auto" unmountOnExit>
                        {projAnno.length > 0 &&
                            projAnno.map((a: Annotation) => {
                                return (
                                    <ReactAnnotation
                                        key={'annotationList-tsx-' + a.id}
                                        annotation={a}
                                        vscode={vscode}
                                        window={window}
                                        username={username}
                                        userId={userId}
                                    />
                                )
                            })}
                    </Collapse>
                </List>
            </ThemeProvider>
        </>
    )
}

export default AnnotationList
