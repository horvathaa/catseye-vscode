/*
 *
 * adamite.tsx
 * React component for the webview panel as a whole. Note that, if you want to debug any of these .tsx files
 * You need to use the command "Developer: Open Webview Developer Tools" (available in command prompt (ctrl/cmd + shift + p))
 *
 */
import * as React from 'react'
import { useState } from 'react'
import { Annotation } from '../../constants/constants'
import ReactAnnotation from './components/annotation'
import NewAnnotation from './components/newAnnotation'
import AnnotationList from './components/annotationList'
import LogIn from './components/login'
import styles from './styles/adamite.module.css'
import annoStyles from './styles/annotation.module.css'
import TopBar from './components/topbar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'
import {
    vscodeTextColor,
    editorForeground,
    editorDescForeground,
    vscodeDisableTextColor,
    vscodeBorderColor,
} from './styles/vscodeStyles'

interface Props {
    vscode: any
    window: Window
    showLogIn: boolean
    username?: string
    userId?: string
}

const AdamitePanel: React.FC<Props> = ({
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
    const [selection, setSelection] = useState('')
    const [showNewAnnotation, setShowNewAnnotation] = useState(false)
    const [showSearchedAnnotations, setShowSearchedAnnotations] =
        useState(false)
    const [searchedAnnotations, setSearchedAnnotations] = useState<
        Annotation[]
    >([])
    const [currentProject, setCurrentProject] = useState(
        window.currentProject ? window.currentProject : ''
    )
    const [currentFile, setCurrentFile] = useState(
        window.currentFile ? window.currentFile : ''
    )
    const [tabVal, setTabVal] = useState(0)
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabVal(newValue)
    }

    // custom styling for tab interface
    interface StyledTabsProps {
        children?: React.ReactNode
        value: number
        onChange: (event: React.SyntheticEvent, newValue: number) => void
    }

    const StyledTabs = styled((props: StyledTabsProps) => (
        <Tabs
            {...props}
            variant="fullWidth"
            TabIndicatorProps={{
                children: <span className="MuiTabs-indicatorSpan" />,
            }}
        />
    ))({
        '& .MuiTabs-indicator': {
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: 'transparent',
        },
        '& .MuiTabs-indicatorSpan': {
            maxWidth: 40,
            width: '100%',
            backgroundColor: vscodeBorderColor, // green
        },
    })

    interface StyledTabProps {
        label: string
    }

    const StyledTab = styled((props: StyledTabProps) => (
        <Tab disableRipple {...props} />
    ))(({ theme }) => ({
        textTransform: 'none',
        fontWeight: theme.typography.fontWeightRegular,
        fontSize: theme.typography.pxToRem(15),
        marginRight: theme.spacing(1),
        color: vscodeDisableTextColor,
        '&.Mui-selected': {
            color: vscodeTextColor,
        },
        '&.Mui-focusVisible': {
            color: vscodeTextColor,
        },
    }))

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
                setSelection(message.payload.selection)
                setShowNewAnnotation(true)
                const newAnnoDiv: HTMLElement | null =
                    document.getElementById('NewAnnotation')
                newAnnoDiv?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                })
                return
            case 'scrollToAnno':
                const annoDiv: HTMLElement | null = document.getElementById(
                    message.payload.id
                )
                const currentFileDiv: Element | null | undefined =
                    document.getElementById('Current File')?.nextElementSibling
                const selectedDiv: Element | null | undefined =
                    document.getElementById('Pinned')?.nextElementSibling
                if (
                    currentFileDiv &&
                    currentFileDiv.contains(annoDiv) &&
                    !currentFileDiv?.classList.contains(styles['showing'])
                ) {
                    currentFileDiv?.classList.remove(styles['hiding'])
                    currentFileDiv?.classList.add(styles['showing'])
                } else if (
                    selectedDiv &&
                    selectedDiv.contains(annoDiv) &&
                    !selectedDiv?.classList.contains(styles['showing'])
                ) {
                    selectedDiv?.classList.remove(styles['hiding'])
                    selectedDiv?.classList.add(styles['showing'])
                }
                if (annoDiv?.classList.contains(annoStyles['outOfFocus'])) {
                    annoDiv?.classList.remove(annoStyles['outOfFocus'])
                }
                annoDiv?.classList.add(annoStyles['inFocus'])
                annoDiv?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                })
                setTimeout(() => {
                    annoDiv?.classList.remove(annoStyles['inFocus'])
                    annoDiv?.classList.add(annoStyles['outOfFocus'])
                }, 3000)
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

    const getSearchedAnnotations = (annotations: Annotation[]): void => {
        setSearchedAnnotations(annotations)
        setShowSearchedAnnotations(annotations.length > 0)
    }

    const saveAnnotationsToJson = (): void => {
        // console.log('saving...');
        vscode.postMessage({
            command: 'saveAnnotationsToJson',
        })
        return
    }

    const showKeyboardShortcuts = (): void => {
        vscode.postMessage({
            command: 'showKeyboardShortcuts',
        })
        return
    }

    const notifyDone = (): void => {
        setShowNewAnnotation(false)
    }

    return (
        <React.Fragment>
            {showNewAnnotation ? (
                <NewAnnotation
                    selection={selection}
                    vscode={vscode}
                    notifyDone={notifyDone}
                />
            ) : null}
            {!showLogin && (
                <div>
                    <StyledTabs value={tabVal} onChange={handleTabChange}>
                        <StyledTab label="Anchored" />
                        <StyledTab label="Unanchored" />
                    </StyledTabs>
                </div>
                // <>
                //     <TopBar
                //         annotations={annotations}
                //         getSearchedAnnotations={getSearchedAnnotations}
                //         saveAnnotationsToJson={saveAnnotationsToJson}
                //         showKeyboardShortcuts={showKeyboardShortcuts}
                //     />
                //     {showSearchedAnnotations &&
                //         searchedAnnotations.map((a) => {
                //             return (
                //                 <ReactAnnotation
                //                     annotation={a}
                //                     vscode={vscode}
                //                     window={window}
                //                     userId={uid}
                //                     username={userName}
                //                 />
                //             )
                //         })}
                // <AnnotationList
                //     currentFile={currentFile}
                //     currentProject={currentProject}
                //     annotations={annotations}
                //     vscode={vscode}
                //     window={window}
                //     username={userName}
                //     userId={uid}
                // />
                // </>
            )}
            {tabVal === 0 ? (
                <AnnotationList
                    currentFile={currentFile}
                    currentProject={currentProject}
                    annotations={annotations}
                    vscode={vscode}
                    window={window}
                    username={userName}
                    userId={uid}
                />
            ) : (
                'No annotations'
            )}
            {showLogin && <LogIn vscode={vscode} />}
        </React.Fragment>
    )
}

export default AdamitePanel
