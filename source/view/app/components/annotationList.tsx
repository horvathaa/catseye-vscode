/*
 *
 * annotationList.tsx
 * Component that takes annotations and segments them into each list we currently support
 * including pinned, current file, and current project.
 *
 */
import { Annotation, Selection } from '../../../constants/constants'
import {
    // getAllAnnotationFilenames,
    getAllAnnotationStableGitUrls,
    sortAnnotationsByLocation,
} from '../utils/viewUtils'
import ReactAnnotation from '../components/annotation'
import * as React from 'react'
import List from '@mui/material/List'
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
    const [selectedAnnos, setSelectedAnnos] = useState<string[]>([])
    const [selectionStatus, setSelectionStatus] = useState<Selection>(
        Selection.none
    )
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
        let updatedSelectedAnnos: string[]
        if (selectedAnnos.includes(anno.id)) {
            updatedSelectedAnnos = selectedAnnos.filter(
                (id: string) => id !== anno.id
            )
            setSelectionStatus(
                updatedSelectedAnnos.length == 0
                    ? Selection.none
                    : Selection.partial
            )
        } else {
            // Can't mutate the types array like done previously!
            // updatedSelectedAnnos = [anno].concat(selectedAnnos)
            updatedSelectedAnnos = [anno.id].concat(selectedAnnos)
            setSelectionStatus(
                updatedSelectedAnnos.length == annotations.length
                    ? Selection.all
                    : Selection.partial
            )
        }
        setSelectedAnnos(updatedSelectedAnnos)
        console.log()
        console.log('UPDATE')
        // console.log(updatedSelectedAnnos)
    }

    const massOperationSelected = (operation: string) => {
        console.log('mass operation selected')
        switch (operation) {
            case 'select':
                console.log('select selected')
                selectAllAnnos()
                break
            default:
                console.log(`function: ${operation} does not exist`)
                break
        }
        // console.log('Mass Operation Selected')
    }

    // Maybe should update to be all visible annos?
    const selectAllAnnos = () => {
        if (selectedAnnos.length == annotations.length) {
            setSelectedAnnos([])
            setSelectionStatus(Selection.none)
        } else {
            setSelectedAnnos(annotations.map((anno: Annotation) => anno.id))
            setSelectionStatus(Selection.all)
            // console.log('Selection status changed')
        }
        // console.log(annotations)
    }

    return (
        <>
            <ThemeProvider theme={theme}>
                <MassOperationsBar
                    massOperationSelected={massOperationSelected}
                    selectedStatus={selectionStatus}
                ></MassOperationsBar>
                <List sx={{ width: '100%' }} component="div" disablePadding>
                    {annotations.map((a: Annotation) => {
                        // console.log(selectedAnnos)
                        // console.log(a)
                        // console.log(selectedAnnos.includes(a))
                        // console.log(
                        //     selectedAnnos.some((anno) => anno.id == a.id)
                        // )
                        return (
                            <ReactAnnotation
                                key={`annotationList-${parentId}tsx-` + a.id}
                                annotation={a}
                                vscode={vscode}
                                window={window}
                                username={username}
                                userId={userId}
                                annotationSelected={annotationSelected}
                                selected={selectedAnnos.includes(a.id)} // Note: Can not use selectedAnnos.includes(a) because it's not the exact same object
                                // https://discuss.codecademy.com/t/array-includes-val-returns-false/536661
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
