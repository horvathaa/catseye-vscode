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

interface AnnoListProps {
    annotations: Annotation[]
    vscode: any
    window: Window
    currentFile: string
    currentProject: string
    username: string
    userId: string
    filters: FilterOptions
}

// NOTE: Currently types bar does not include "untyped" option
const AnnotationList: React.FC<AnnoListProps> = ({
    annotations,
    vscode,
    window,
    currentFile,
    currentProject,
    username,
    userId,
    filters,
}) => {
    const [openPinned, setOpenPinned] = useState(false)
    const [pinnedAnno, setPinnedAnno] = useState<Annotation[]>([])
    const [filteredAnno, setFilteredAnno] = useState<Annotation[]>([])
    const fields = ['annotation']
    const complex = ['anchors']
    const replies = ['replies']

    const handlePinClick = () => {
        setOpenPinned(!openPinned)
    }

    React.useEffect(() => {
        if (annotations.length) {
            displayAnnotations()
        }
    }, [annotations]) // annotations state set in adamite.tsx

    React.useEffect(() => {
        if (annotations.length) {
            displayAnnotations()
        }
    }, [filters]) // annotations state set in adamite.tsx

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
            'All Unpinned': [],
        }
        annotations.forEach((a: Annotation) => {
            const annoFiles = getAllAnnotationStableGitUrls(a)
            if (a.selected) {
                output['Pinned'].push(a)
            } else if (annoFiles.includes(currentFile)) {
                output['Current File'].push(a)
                output['All Unpinned'].push(a)
            } else if (a.projectName === currentProject) {
                output['Current Project'].push(a) // only pulls annotations since last commit?
                output['All Unpinned'].push(a)
            }
        })

        return output
    }

    // Alternative way of getting pinned files?
    const pinned: Annotation[] = annotations
        ? annotations.filter((anno) => {
              anno.selected === true
          })
        : []

    const filterResolved = (
        annos: Annotation[],
        showResolved: boolean
    ): Annotation[] => {
        return showResolved
            ? annos
            : annos.filter((anno) => {
                  return !anno.resolved // Should this not reference to prop to be 'true'
              })

        // return showResolved ? annos : annos.filter((anno) => !anno.resolved)
    }

    const filterInFile = (
        annos: Annotation[],
        showFileOnly: boolean
    ): Annotation[] => {
        return showFileOnly
            ? annos.filter((anno) => {
                  const annoFiles = getAllAnnotationStableGitUrls(anno)
                  return annoFiles.includes(currentFile) // Should this not reference to prop to be 'true'
              })
            : annos
    }

    const filterMine = (annos: Annotation[]): Annotation[] => {
        return annos.filter((anno) => anno['authorId'] === userId)
    }

    const filterOthers = (annos: Annotation[]): Annotation[] => {
        return annos.filter((anno) => anno['authorId'] !== userId)
    }

    const filterAuthors = (annos: Annotation[], optionGroup: OptionGroup) => {
        if (
            optionGroup.options.filter((option) => option['selected'] === true)
                .length == 2
        ) {
            return annos
        } else if (
            optionGroup.options.filter(
                (option) =>
                    option['name'] === AuthorOptions.mine &&
                    option['selected'] === true
            ).length > 0
        ) {
            return filterMine(annos)
        } else if (
            optionGroup.options.filter(
                (option) =>
                    option['name'] === AuthorOptions.others &&
                    option['selected'] === true
            ).length > 0
        ) {
            return filterOthers(annos)
        } else {
            return []
        }
    }
    // array1.filter(value => array2.includes(value));
    const filterTypes = (annos: Annotation[], optionGroup: OptionGroup) => {
        // Could maybe be faster with reduce?
        const selectedOptions = optionGroup.options.filter(
            (option) => option['selected'] === true
        )
        const untyped = optionGroup.options.filter(
            (option) => option['name'] === 'untyped'
        )[0]
        // .map((option: Option) => option.name)
        return annos.filter((anno) => {
            if (untyped['selected'] && anno['types'].length == 0) {
                return true
            }
            return (
                selectedOptions.filter((option: Option) => {
                    return (anno['types'] as string[]).includes(option.name)
                }).length > 0
            )
        })
    }

    // Currently filters on orig annotation author, add option for user replies?
    const optionSearch = (
        annos: Annotation[],
        optionGroup: OptionGroup
    ): Annotation[] => {
        // Might be able to convert this to what I have for filterTypes
        if (optionGroup.label === 'Author') {
            return filterAuthors(annos, optionGroup)
        } else if (optionGroup.label === 'Type') {
            return filterTypes(annos, optionGroup)
        } else {
            return []
        }
    }

    const textSearch = (annos: Annotation[], text: string): Annotation[] => {
        return annos.filter((anno) => {
            //  we search on
            // including author, anchors, annotation, createdTimestamp, file path, and replies
            return Object.keys(anno).some(function (key) {
                if (fields.includes(key)) {
                    // Check if text is in annotations
                    return anno['annotation'] !== undefined
                        ? anno['annotation']
                              .toLowerCase()
                              .includes(text.toLowerCase())
                        : false
                } else if (complex.includes(key)) {
                    const arr = anno['anchors']
                    let r = arr.map((a: any) => {
                        const inAnchor = a['anchorText']
                            ? a['anchorText']
                                  .toLowerCase()
                                  .includes(text.toLowerCase())
                            : false
                        const inFile = a['visiblePath']
                            ? a['visiblePath']
                                  .toLowerCase()
                                  .includes(text.toLowerCase())
                            : false
                        return inAnchor || inFile
                    })
                    return r.includes(true)
                } else if (replies.includes(key)) {
                    let q = Array.isArray(anno['replies'])
                        ? anno['replies'].map((a: Reply) => {
                              let b = false
                              return (
                                  a['replyContent']
                                      .toLowerCase()
                                      .includes(text.toLowerCase()) || b
                              )
                          })
                        : [anno['replies'] === text] // Should this be includes rather than === ?
                    return q.includes(true)
                }
                return false
            })
        })
    }

    // now, with the filtered array of annotations
    // this solution is adapted from here: https://stackoverflow.com/questions/8517089/js-search-in-object-values
    const filtered: Annotation[] = annotations
        ? optionSearch(
              optionSearch(
                  filterResolved(
                      filterInFile(
                          textSearch(annotations, filters.searchText),
                          filters.showFileOnly
                      ),
                      filters.showResolved
                  ),
                  filters.authorOptions
              ),
              filters.typeOptions
          )
        : []

    const displayAnnotations = () => {
        const groupings = getAnnotations()
        Object.keys(groupings).forEach((group) => {
            let annot = groupings[group]
            if (group === 'Pinned') {
                setPinnedAnno(annot)
            }
            if (group === 'All Unpinned') {
                setFilteredAnno(filtered)
            }
        })
    }

    return (
        <>
            <ThemeProvider theme={theme}>
                <List
                    sx={{
                        width: '100%',
                        border: '1.5px',
                        borderRadius: '4px',
                        borderStyle: 'solid',
                        borderColor: iconColor,
                    }}
                    component="div"
                    disablePadding
                >
                    <ListItemButton onClick={handlePinClick}>
                        <ListItemIcon>
                            <PushPinIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={openPinned ? 'Hide Pinned' : 'Show Pinned'}
                        />
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
                </List>
                <List sx={{ width: '100%' }} component="div" disablePadding>
                    {filtered.map((a: Annotation) => {
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
                </List>
            </ThemeProvider>
        </>
    )
}

export default AnnotationList
