import { Edit } from '@mui/icons-material'
import { Checkbox } from '@mui/material'
import * as React from 'react'
import { BrowserOutput as BrowserOutputInterface } from '../../../constants/constants'
import styles from '../styles/browserOutputs.module.css'
import { cardStyle } from '../styles/vscodeStyles'
import { formatTimestamp } from '../utils/viewUtils'
import CatseyeButton from './annotationComponents/CatseyeButton'
import TextEditor from './annotationComponents/textEditor'

interface Props {
    browserOutputs: BrowserOutputInterface[]
    currentProject: string
    vscode: any
    addToBundle: (obj: any) => void
    removeFromBundle: (obj: any) => void
    annotatingOutput: boolean
    setAnnotatingOutput: (bool: boolean) => void
}

interface OutputProps {
    browserOutput: BrowserOutputInterface
    currentProject: string
    transmitUpdatedOutput: (bo: BrowserOutputInterface) => void
    addToBundle: (obj: any) => void
    removeFromBundle: (obj: any) => void
    updateContext: (showMenuOption: boolean) => void
    setAnnotatedOutput: (annotatedOutput: AnnotatedOutputHandler) => void
}

export const BrowserOutput: React.FC<OutputProps> = ({
    browserOutput,
    currentProject,
    transmitUpdatedOutput,
    addToBundle,
    removeFromBundle,
    updateContext,
    setAnnotatedOutput,
}) => {
    const [bo, setBo] = React.useState<BrowserOutputInterface>(browserOutput)
    const [selected, setSelected] = React.useState<boolean>(false)
    const [editing, setEditing] = React.useState<boolean>(false)
    const handleEnter = (annotation: string) => {
        const updatedBo = { ...bo, annotation }
        setBo(updatedBo)
        transmitUpdatedOutput(updatedBo)
        setEditing(false)
    }
    React.useEffect(() => {
        setBo(
            browserOutput.project
                ? browserOutput
                : { ...browserOutput, project: currentProject }
        )
    }, [browserOutput])

    const handleSelected = () => {
        const newSel = !selected
        if (newSel) {
            addToBundle(bo)
        } else {
            removeFromBundle(bo)
        }
        setSelected(newSel)
    }

    const clickMe = (e: React.SyntheticEvent) => {
        const neighbor = (e.target as HTMLBaseElement).previousElementSibling
        console.log('eh', neighbor)
    }

    const { padding, paddingBottom, ...rest } = cardStyle
    return (
        <div className={styles['flex']}>
            <Checkbox
                checked={selected}
                onChange={handleSelected}
                inputProps={{ 'aria-label': 'controlled' }}
            />
            <div
                style={rest}
                className={`${styles['m2']} ${styles['border-1px-medium']} ${styles['border-radius-8']} ${styles['flex-col']} ${styles['flex']} ${styles['justify-content-center']} ${styles['align-items-center']} ${styles['p2']}`}
                id={bo.id}
            >
                <div
                    className={`${styles['p2']} ${styles['align-self-start']}`}
                >
                    Output generated at {formatTimestamp(bo.createdTimestamp)}{' '}
                    while editing {currentProject}
                </div>
                <img
                    className={`${styles['wh-80']}`}
                    id={bo.id + '-img'}
                    src={bo.data}
                    alt={'data'}
                    onMouseEnter={(e) => {
                        setAnnotatedOutput({
                            outputToAnnotate: {
                                id: bo.id,
                                mousePos: { x: e.clientX, y: e.clientY },
                            },
                        })
                        updateContext(true)
                    }}
                    onMouseLeave={() => {
                        console.log('mouse left :-(')
                        setAnnotatedOutput(null)
                        updateContext(false)
                    }}
                    onMouseMove={(e) => {
                        setAnnotatedOutput({
                            outputToAnnotate: {
                                id: bo.id,
                                mousePos: { x: e.clientX, y: e.clientY },
                            },
                        })
                        // updateContext(true)
                    }}
                />
                <div onClick={clickMe}>CLICK ME</div>
                <div
                    className={`${styles['flex']} ${styles['wh-80']} ${styles['justify-content-space-between']} ${styles['p2']}`}
                >
                    {editing ? (
                        <TextEditor
                            content={bo.annotation ?? ''}
                            submissionHandler={handleEnter}
                            cancelHandler={() => {
                                setEditing(false)
                            }}
                            showSplitButton={false}
                            style={{ width: '80%' }}
                        />
                    ) : bo.annotation ? (
                        bo.annotation
                    ) : (
                        ''
                    )}
                    <CatseyeButton
                        buttonClicked={() => setEditing(!editing)}
                        name="Annotate Output"
                        icon={<Edit fontSize="small" />}
                    />
                </div>
            </div>
        </div>
    )
}

interface MousePosition {
    x: number
    y: number
}

interface AnnotatedOutput {
    id: string
    mousePos: MousePosition
}

interface AnnotatedOutputHandler {
    outputToAnnotate: AnnotatedOutput | null
}

interface BrowserOutputElementMetadata {
    id: string
    parentEl: HTMLElement
    imgEl: HTMLElement
    imgBoundingBox: DOMRect
}

export const BrowserOutputs: React.FC<Props> = ({
    browserOutputs,
    currentProject,
    vscode,
    addToBundle,
    removeFromBundle,
    annotatingOutput,
    setAnnotatingOutput,
}) => {
    const [annotatedOutput, _setAnnotatedOutput] =
        React.useState<AnnotatedOutputHandler>(null)
    const setAnnotatedOutput = (output) => {
        console.log('output', output)
        _setAnnotatedOutput(output)
    }
    const [outputAnnotationPosition, setOutputAnnotationPosition] =
        React.useState<MousePosition>({ x: -1, y: -1 })
    // console.log('outputPosition', outputAnnotationPosition)
    /* 
    Yes, It's possible.

    If you add "mouseover" event to the document it will fire instantly and you can get the mouse position, of course if mouse pointer was over the document.

    document.addEventListener('mouseover', setInitialMousePos, false);
    */

    // const checkIfMousePosIsInBoundingBox = (
    //     mousePos: MousePosition,
    //     browserOutputMetadata: BrowserOutputElementMetadata
    // ): boolean => {
    //     console.log(
    //         'top less than',
    //         browserOutputMetadata.imgBoundingBox.top <= mousePos.y
    //     )
    //     console.log(
    //         'bottom greater than',
    //         browserOutputMetadata.imgBoundingBox.top + window.scrollY >=
    //             mousePos.y
    //     )
    //     return (
    //         browserOutputMetadata.imgBoundingBox.top <= mousePos.y &&
    //         browserOutputMetadata.imgBoundingBox.top + window.scrollY >=
    //             mousePos.y &&
    //         // browserOutputMetadata.imgBoundingBox.bottom >= mousePos.y &&
    //         browserOutputMetadata.imgBoundingBox.left <= mousePos.x &&
    //         // browserOutputMetadata.imgBoundingBox.right >= mousePos.x
    //         browserOutputMetadata.imgBoundingBox.left + window.scrollX >=
    //             mousePos.x
    //     )
    // }

    const getAnnotatedOutput = (newMousePos: MousePosition) => {
        const parent = document.getElementById('browser-outputs-parent')
        if (parent) {
            const ids = browserOutputs.map((b) => b.id)
            const browserOutputEls: BrowserOutputElementMetadata[] = ids.map(
                (i) => {
                    const parentEl = document.getElementById(i)
                    const imgEl = document.getElementById(i + '-img')

                    return {
                        id: i,
                        parentEl,
                        imgEl,
                        imgBoundingBox: imgEl.getBoundingClientRect(),
                    }
                }
            )
            console.log(browserOutputEls)
            // const match = browserOutputEls.find((b) =>
            //     checkIfMousePosIsInBoundingBox(newMousePos, b)
            // )
            // match ? console.log('match', match) : console.log('no match', match)
        }
    }

    // function getOutputMousePos(event: MouseEvent) {
    //     const newMousePos = { x: event.clientX, y: event.clientY }
    //     setOutputAnnotationPosition(newMousePos)
    //     document.removeEventListener('mouseover', getOutputMousePos, false)
    //     setAnnotatingOutput(false)
    //     getAnnotatedOutput(newMousePos)
    // }

    React.useEffect(() => {
        if (annotatingOutput) {
            console.log('annotating this guy NOW', annotatedOutput)
            setAnnotatingOutput(false)
            // const hewwo = document.querySelectorAll(':hover')
            // document.addEventListener('mouseover', getOutputMousePos)

            // console.log('hewwwwwoooo', hewwo)
            // document.removeEventListener('mouseover')
        }
    }, [annotatingOutput])

    const transmitUpdatedOutput = (
        updatedBrowserOutput: BrowserOutputInterface
    ) => {
        vscode.postMessage({
            command: 'updateBrowserOutput',
            browserOutput: updatedBrowserOutput,
        })
    }

    const updateContext = (showMenu: boolean) => {
        vscode.postMessage({
            command: 'showAnnotateOutputContextMenuOption',
            showMenu,
        })
    }

    return (
        <div id={'browser-outputs-parent'}>
            {browserOutputs
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .map((o) => (
                    <BrowserOutput
                        key={o.id}
                        browserOutput={o}
                        currentProject={currentProject}
                        transmitUpdatedOutput={transmitUpdatedOutput}
                        addToBundle={addToBundle}
                        removeFromBundle={removeFromBundle}
                        updateContext={updateContext}
                        setAnnotatedOutput={setAnnotatedOutput}
                    />
                ))}
        </div>
    )
}
