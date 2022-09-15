/*
 *
 * catseye.tsx
 * React component for the webview panel as a whole. Note that, if you want to debug any of these .tsx files
 * You need to use the command "Developer: Open Webview Developer Tools" (available in command prompt (ctrl/cmd + shift + p))
 *
 */
import * as React from 'react'
import { useState } from 'react'
import {
    AnchorObject,
    Annotation,
    AuthorOptions,
    FilterOptions,
    Option,
    OptionGroup,
    Reply,
    Scope,
    Sort,
} from '../../constants/constants'

import NewAnnotation from './components/newAnnotation'
import AnnotationList from './components/annotationList'
import LogIn from './components/login'
import TopBar from './components/topbar'
import { defaultFilterOptions } from './utils/viewUtilsTsx'
import {
    getAllAnnotationStableGitUrls,
    sortAnnotationsByLocation,
    sortAnnotationsByTime,
} from './utils/viewUtils'
import MergeAnnotations from './components/mergeAnnotations'

interface Props {
    vscode: any
    window: Window
    showLogIn: boolean
    username?: string
    userId?: string
}

const CatseyePanel: React.FC<Props> = ({
    vscode,
    window,
    showLogIn,
    username,
    userId,
}) => {
    const [annotations, setAnnotations] = useState(window.data)
    const [showLogin, setShowLogin] = useState(showLogIn)
    const [userName, setUsername] = useState(
        window.username ? window.username : ''
    )
    const [uid, setUserId] = useState(window.userId ? window.userId : '')
    const [newAnchors, _setNewAnchors] = useState<AnchorObject[]>([])
    const newAnchorsRef = React.useRef(newAnchors)
    const setNewAnchors = (newAnchorsArr: AnchorObject[]): void => {
        newAnchorsRef.current = newAnchorsArr
        _setNewAnchors(newAnchorsArr)
    }
    const [newAnnotationId, setNewAnnotationId] = useState<string>('')
    const [showNewAnnotation, setShowNewAnnotation] = useState<boolean>(false)
    const [annosToConsolidate, setAnnosToConsolidate] = useState<Annotation[]>(
        []
    )
    const [filterOptions, setFilterOptions] =
        React.useState<FilterOptions>(defaultFilterOptions)
    const [currentProject, setCurrentProject] = useState(
        window.currentProject ? window.currentProject : ''
    )
    const [currentFile, setCurrentFile] = useState(
        window.currentFile ? window.currentFile : ''
    )
    const fields = ['annotation']
    const complex = ['anchors']
    const replies = ['replies']

    // incoming messages are created and sent by ViewLoader.ts
    // e.g., ViewLoader's function "public createNewAnno" sends the "newAnno" message
    // which this listener receives and handles
    const handleIncomingMessages = (e: MessageEvent<any>) => {
        const message = e.data
        switch (message.command) {
            case 'login':
                setShowLogin(true)
                return
            case 'update':
                if (message.payload.annotationList)
                    setAnnotations(message.payload.annotationList)
                if (message.payload.currentFile)
                    setCurrentFile(message.payload.currentFile)
                if (message.payload.currentProject)
                    setCurrentProject(message.payload.currentProject)
                if (message.payload.currentUser)
                    setUserId(message.payload.currentUser)
                // console.log('message', message)
                return
            case 'newAnno':
                setNewAnchors(message.payload.anchorObject)
                setShowNewAnnotation(true)
                setNewAnnotationId(message.payload.annoId)
                const newAnnoDiv: HTMLElement | null =
                    document.getElementById('NewAnnotation')
                newAnnoDiv?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                })
                return
            case 'newAnchorForNewAnnotation':
                setNewAnchors(
                    newAnchorsRef.current.concat(message.payload.anchor)
                )
                return
        }
    }

    React.useEffect(() => {
        window.addEventListener('message', handleIncomingMessages)
        window.document.addEventListener('keydown', handleCopyText)
        return () => {
            window.removeEventListener('message', handleIncomingMessages)
            window.document.removeEventListener('keydown', handleCopyText)
        }
    }, [])

    React.useEffect(() => {
        if (!showLogIn && (!userName || !uid) && username && userId) {
            setUsername(username)
            setUserId(userId)
        }
    }, [])

    // Webview's do not share clipboard data with the main extension
    // so we need to do this manually :-/
    const handleCopyText = (e: Event): void => {
        const keyboardEvent = e as KeyboardEvent
        if (
            window &&
            (keyboardEvent.code === 'KeyC' || keyboardEvent.code === 'KeyX') &&
            keyboardEvent.ctrlKey
        ) {
            const copiedText: string | undefined = window
                .getSelection()
                ?.toString()
            if (copiedText)
                vscode.postMessage({
                    command: 'copyTextFromWebview',
                    text: copiedText,
                })
        }
    }

    const saveAnnotationsToJson = (): void => {
        // console.log('saving...');
        vscode.postMessage({
            command: 'saveAnnotationsToJson',
        })
        return
    }

    // would be nice to have
    // const showKeyboardShortcuts = (): void => {
    //     vscode.postMessage({
    //         command: 'showKeyboardShortcuts',
    //     })
    //     return
    // }

    const filtersUpdated = (filters: FilterOptions): void => {
        setFilterOptions(filters)
    }

    const notifyDone = (): void => {
        setShowNewAnnotation(false)
    }

    const notifyMergeDone = (): void => {
        setAnnosToConsolidate([])
        // setShowMergeAnnotation(false)
    }

    // Alternative way of getting pinned files?
    // console.log('annotations?', annotations)
    const pinned: Annotation[] = annotations
        ? annotations.filter((anno) => anno.selected === true)
        : []
    // console.log('pinned', pinned)

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

    const sortAnnotationByFilter = (
        annos: Annotation[],
        currSort: Sort
    ): Annotation[] => {
        return currSort === Sort.location
            ? sortAnnotationsByLocation(annos, currentFile)
            : sortAnnotationsByTime(annos)
    }

    const filterScope = (annos: Annotation[], scope: Scope): Annotation[] => {
        switch (scope) {
            case Scope.all:
                return annos
            case Scope.file:
                return annos.filter((anno) => {
                    const annoFiles = getAllAnnotationStableGitUrls(anno)
                    return annoFiles.includes(currentFile) // Should this not reference to prop to be 'true'
                })
            case Scope.project:
                return annos.filter(
                    (anno) => anno.projectName == currentProject
                )
            default:
                throw new Error(`Non-existent scope in switch: ${scope}`)
        }
    }

    const filterMine = (annos: Annotation[]): Annotation[] => {
        return annos.filter((anno) => anno['authorId'] === uid)
    }

    const filterOthers = (annos: Annotation[]): Annotation[] => {
        return annos.filter((anno) => anno['authorId'] !== uid)
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
                    (option['name'] === AuthorOptions.mine ||
                        option['name'] === userName) &&
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
        ? filterOptions.pinnedOnly
            ? pinned.filter((a) => !a.deleted && !a.outOfDate)
            : sortAnnotationByFilter(
                  optionSearch(
                      optionSearch(
                          filterResolved(
                              filterScope(
                                  textSearch(
                                      annotations,
                                      filterOptions.searchText
                                  ),
                                  filterOptions.scope
                              ),
                              filterOptions.showResolved
                          ),
                          filterOptions.authorOptions
                      ),
                      filterOptions.typeOptions
                  ),
                  filterOptions.sort
              ).filter((a) => !a.deleted && !a.outOfDate)
        : []

    const consolidateAnnos = (annos: Annotation[]) => {
        setAnnosToConsolidate(annos)
    }

    return (
        <React.Fragment>
            {annosToConsolidate.length > 0 ? (
                <MergeAnnotations
                    vscode={vscode}
                    username={userName ?? ''}
                    userId={userId ?? ''}
                    notifyDone={notifyMergeDone}
                    annotations={annosToConsolidate}
                />
            ) : null}
            {!showLogin && (
                <div style={{ padding: '0 8px' }}>
                    <TopBar
                        saveAnnotationsToJson={saveAnnotationsToJson}
                        // showKeyboardShortcuts={showKeyboardShortcuts}
                        filtersUpdated={filtersUpdated}
                        vscode={vscode}
                        githubUsername={userName ?? ''}
                    />
                    {/* <MassOperationsBar
                        massOperationSelected={massOperationSelected}
                    ></MassOperationsBar> */}
                    {showNewAnnotation && newAnchors ? (
                        <NewAnnotation
                            newAnnoId={newAnnotationId}
                            newAnchors={newAnchors}
                            vscode={vscode}
                            notifyDone={notifyDone}
                        />
                    ) : null}
                    <AnnotationList
                        title=""
                        parentId="main"
                        annotations={filtered}
                        // annotations={annotations}
                        vscode={vscode}
                        window={window}
                        username={userName}
                        userId={uid}
                        consolidateAnnos={consolidateAnnos}
                    />
                </div>
            )}
            {showLogin && <LogIn vscode={vscode} />}
        </React.Fragment>
    )
}

export default CatseyePanel
