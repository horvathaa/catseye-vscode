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
import {
    deleteAnnotation,
    mergeAnnotations,
    pinAnnotation,
    resolveAnnotation,
    shareAnnotation,
} from '../utils/viewUtilsTsx'

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
    const [selectedAnnoIds, setSelectedAnnoIds] = useState<string[]>([])
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

    const selectedAnnotations = annotations.filter((anno) =>
        selectedAnnoIds.includes(anno.id)
    )

    const annotationSelected = (anno: Annotation) => {
        let updatedSelectedAnnoIds: string[]
        if (selectedAnnoIds.includes(anno.id)) {
            updatedSelectedAnnoIds = selectedAnnoIds.filter(
                (id: string) => id !== anno.id
            )
            setSelectionStatus(
                updatedSelectedAnnoIds.length == 0
                    ? Selection.none
                    : Selection.partial
            )
        } else {
            // Can't mutate the types array like done previously!
            // updatedSelectedAnnoIds = [anno].concat(selectedAnnoIds)
            updatedSelectedAnnoIds = [anno.id].concat(selectedAnnoIds)
            setSelectionStatus(
                updatedSelectedAnnoIds.length == annotations.length
                    ? Selection.all
                    : Selection.partial
            )
        }
        setSelectedAnnoIds(updatedSelectedAnnoIds)
        console.log()
        console.log('UPDATE')
        // console.log(updatedSelectedAnnoIds)
    }

    const massOperationSelected = (
        e: React.SyntheticEvent,
        operation: string
    ) => {
        console.log('mass operation selected')
        switch (operation) {
            case 'select':
                selectAllAnnos()
                break
            case 'merge':
                mergeAnnotations(e, vscode, selectedAnnotations)
                break
            case 'pin':
                selectedAnnotations.map((anno: Annotation) =>
                    pinAnnotation(e, vscode, anno)
                )
                break
            case 'share':
                selectedAnnotations.map((anno: Annotation) =>
                    shareAnnotation(e, vscode, anno)
                )
                break
            case 'resolve':
                selectedAnnotations.map((anno: Annotation) =>
                    resolveAnnotation(e, vscode, anno)
                )
                break
            case 'delete':
                selectedAnnotations.map((anno: Annotation) =>
                    deleteAnnotation(e, vscode, anno)
                )
                break
            default:
                console.log(`function: ${operation} does not exist`)
                break
        }
        // console.log('Mass Operation Selected')
    }

    // Maybe should update to be all visible annos?
    const selectAllAnnos = () => {
        if (selectedAnnoIds.length == annotations.length) {
            setSelectedAnnoIds([])
            setSelectionStatus(Selection.none)
        } else {
            setSelectedAnnoIds(annotations.map((anno: Annotation) => anno.id))
            setSelectionStatus(Selection.all)
        }
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
                        // console.log(selectedAnnoIds)
                        // console.log(a)
                        // console.log(selectedAnnoIds.includes(a))
                        // console.log(
                        //     selectedAnnoIds.some((anno) => anno.id == a.id)
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
                                selected={selectedAnnoIds.includes(a.id)} // Note: Can not use selectedAnnoIds.includes(a) because it's not the exact same object
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
