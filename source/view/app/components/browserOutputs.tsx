import { Brightness1, Edit } from '@mui/icons-material'
import { Checkbox } from '@mui/material'
import { Delete } from '@mui/icons-material'
import * as React from 'react'
import {
    BrowserOutput as BrowserOutputInterface,
    OutputAnnotation,
} from '../../../constants/constants'
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
    annotatingOutput: boolean
    setAnnotatingOutput: (setVal: boolean) => void
}

interface OutputContentProps {
    o: OutputAnnotation
    updateOutputAnnotation: (o: OutputAnnotation) => void
    deleteOutputAnnotation: (o: OutputAnnotation) => void
}

const OutputContent: React.FC<OutputContentProps> = ({
    o,
    updateOutputAnnotation,
    deleteOutputAnnotation,
}) => {
    const [editing, setEditing] = React.useState<boolean>(o.annotation === '')

    const handleEnter = (annotation: string) => {
        const updatedBo = { ...o, annotation }
        updateOutputAnnotation(updatedBo)
        setEditing(false)
    }

    const handleMouseEnter = () => {
        const correspondingDiv = document.getElementById(o.id)
        correspondingDiv.classList.add(styles['animation-class'])
        const myDiv = document.getElementById(o.id + '-list-item')
        myDiv.classList.add(styles['animation-class'])
    }

    const handleMouseLeave = () => {
        const correspondingDiv = document.getElementById(o.id)
        correspondingDiv.classList.remove(styles['animation-class'])
        const myDiv = document.getElementById(o.id + '-list-item')
        myDiv.classList.remove(styles['animation-class'])
    }

    return (
        <div
            key={o.id + o.outputNumber}
            className={`${styles['flex']} ${styles['w-100']}`}
        >
            <div
                id={o.id + '-list-item'}
                className={`${styles['dot']} ${styles['content']} ${styles['m2']}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {o.outputNumber}
            </div>
            <div
                className={`${styles['justify-content-space-between']} ${styles['flex']} ${styles['w-100']}`}
            >
                {editing ? (
                    <TextEditor
                        content={o.annotation ?? ''}
                        submissionHandler={handleEnter}
                        cancelHandler={() => {
                            setEditing(false)
                        }}
                        showSplitButton={false}
                        style={{ width: '80%' }}
                    />
                ) : (
                    <div
                        className={`${styles['p2']} ${styles['font-medium']} ${styles['align-items-center']} ${styles['flex']} ${styles['w-100']}`}
                    >
                        {o.annotation}
                    </div>
                )}
                <div className={styles['flex']}>
                    <CatseyeButton
                        buttonClicked={() => setEditing(!editing)}
                        name="Annotate Output"
                        icon={<Edit fontSize="small" />}
                    />
                    <CatseyeButton
                        buttonClicked={() => deleteOutputAnnotation(o)}
                        name="Delete Output Annotation"
                        icon={<Delete fontSize="small" />}
                    />
                </div>
            </div>
        </div>
    )
}

export const BrowserOutput: React.FC<OutputProps> = ({
    browserOutput,
    currentProject,
    transmitUpdatedOutput,
    addToBundle,
    removeFromBundle,
    updateContext,
    setAnnotatingOutput,
    annotatingOutput,
}) => {
    const [bo, setBo] = React.useState<BrowserOutputInterface>(browserOutput)
    const [selected, setSelected] = React.useState<boolean>(false)

    const [annotatedOutput, setAnnotatedOutput] =
        React.useState<AnnotatedOutputHandler>(null)
    const [outputAnnotations, _setOutputAnnotations] = React.useState<
        OutputAnnotation[]
    >(bo.outputAnnotations ?? [])
    const outputAnnotationsRef = React.useRef(outputAnnotations)
    const setOutputAnnotations = (newOutputAnnotations: OutputAnnotation[]) => {
        outputAnnotationsRef.current = newOutputAnnotations
        _setOutputAnnotations(newOutputAnnotations)

        const newBrowserOutput = {
            ...bo,
            outputAnnotations: newOutputAnnotations,
        }
        setBo(newBrowserOutput)
        transmitUpdatedOutput(newBrowserOutput)
    }

    const updateOutputAnnotation = (o: OutputAnnotation) => {
        setOutputAnnotations(
            outputAnnotations.map((out) => (out.id === o.id ? o : out))
        )
    }

    const deleteOutputAnnotation = (o: OutputAnnotation) => {
        removeOutputNodeFromDOM(o)
        console.log('o', o)
        const needsRenumbering = outputAnnotations.slice(o.outputNumber)
        console.log('needs renumbering', needsRenumbering)
        const updated = needsRenumbering.map((n) => {
            console.log('n', n)
            const newNum = n.outputNumber - 1
            const newId = `${bo.id}-${newNum}`
            const outputAnnoDiv = document.getElementById(n.id)
            console.log('old div', outputAnnoDiv)
            outputAnnoDiv.id = newId
            outputAnnoDiv.innerHTML = `${newNum}`
            console.log('new div', outputAnnoDiv)
            return { ...n, id: newId, outputNumber: newNum }
        })
        console.log('updated', updated)
        console.log(
            'new list',
            outputAnnotations.slice(0, o.outputNumber - 1).concat(updated)
        )
        setOutputAnnotations(
            outputAnnotations.slice(0, o.outputNumber - 1).concat(updated)
        )
    }

    React.useEffect(() => {
        setBo(
            browserOutput.project
                ? browserOutput
                : { ...browserOutput, project: currentProject }
        )
    }, [browserOutput])

    const setPositionForElement = (
        divEl: HTMLElement,
        o: OutputAnnotation
    ): void => {
        const imgElBox = document
            .getElementById(bo.id + '-img')
            .getBoundingClientRect()

        divEl.style.top = `${
            Math.floor(imgElBox.height * o.yPosRelativeToImg) +
            imgElBox.top +
            window.scrollY
        }px`

        divEl.style.left = `${
            Math.floor(imgElBox.width * o.xPosRelativeToImg) +
            imgElBox.left +
            window.scrollX
        }px`
    }

    const removeOutputNodeFromDOM = (o: OutputAnnotation) => {
        const parentEl = document.getElementById(bo.id)
        const divEl = document.getElementById(o.id)
        parentEl.removeChild(divEl)
    }

    const appendOutputNodeToDOMGivenRelativePosition = (
        o: OutputAnnotation
    ): void => {
        const parentEl = document.getElementById(bo.id)
        const divEl = document.createElement('div')
        divEl.id = o.id
        divEl.classList.add(styles['dot'], styles['content'])
        divEl.innerHTML = `${o.outputNumber}`
        divEl.style.zIndex = '100'
        divEl.style.position = 'absolute'
        setPositionForElement(divEl, o)
        parentEl.appendChild(divEl)
    }

    const handleResize = () => {
        outputAnnotationsRef.current.forEach((o) => {
            const divEl = document.getElementById(o.id)
            setPositionForElement(divEl, o)
        })
    }

    const handleLoadAndAnnotateImages = () => {
        const img = document.getElementById(bo.id + '-img') as HTMLImageElement
        if (img && img.complete) {
            bo.outputAnnotations?.forEach((o) =>
                appendOutputNodeToDOMGivenRelativePosition(o)
            )
        }
    }

    React.useEffect(() => {
        window.addEventListener('resize', handleResize)
        window.addEventListener('load', handleLoadAndAnnotateImages)
        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('load', handleLoadAndAnnotateImages)
        }
    }, [])

    React.useEffect(() => {
        if (annotatingOutput && annotatedOutput) {
            const imgEl = document.getElementById(bo.id + '-img')

            const imgElBoundingBox = imgEl.getBoundingClientRect()
            const xPosRelativeToImg =
                (annotatedOutput.outputToAnnotate.mousePos.x -
                    imgElBoundingBox.left) /
                imgElBoundingBox.width
            const yPosRelativeToImg =
                (annotatedOutput.outputToAnnotate.mousePos.y -
                    imgElBoundingBox.top) /
                imgElBoundingBox.height
            const num = outputAnnotations.length + 1
            const newOutputAnnotation: OutputAnnotation = {
                id: `${bo.id}-${num}`,
                xPosRelativeToImg,
                yPosRelativeToImg,
                annotation: '',
                outputNumber: num,
            }
            setOutputAnnotations(outputAnnotations.concat(newOutputAnnotation))
            appendOutputNodeToDOMGivenRelativePosition(newOutputAnnotation)
            setAnnotatingOutput(false)
        }
    }, [annotatingOutput])

    const handleSelected = () => {
        const newSel = !selected
        if (newSel) {
            addToBundle(bo)
        } else {
            removeFromBundle(bo)
        }
        setSelected(newSel)
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
                className={`${styles['annotatable-output']} ${styles['m2']} ${styles['border-1px-medium']} ${styles['border-radius-8']} ${styles['flex-col']} ${styles['flex']} ${styles['justify-content-center']} ${styles['align-items-center']} ${styles['p2']}`}
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
                    onMouseLeave={(e) => {
                        const boundingBox = (
                            e.target as HTMLElement
                        ).getBoundingClientRect()
                        const mousePos = {
                            x: e.clientX,
                            y: e.clientY,
                        }

                        if (
                            mousePos.x > boundingBox.left &&
                            mousePos.x < boundingBox.right &&
                            mousePos.y > boundingBox.top &&
                            mousePos.y < boundingBox.bottom
                        ) {
                            return
                        } else {
                            setAnnotatedOutput(null)
                            updateContext(false)
                        }
                    }}
                    onMouseMove={(e) => {
                        setAnnotatedOutput({
                            outputToAnnotate: {
                                id: bo.id,
                                mousePos: { x: e.clientX, y: e.clientY },
                            },
                        })
                    }}
                />
                <div
                    className={`${styles['flex-col']} ${styles['wh-80']} ${styles['justify-content-space-between']} ${styles['p2']}`}
                >
                    {outputAnnotations.map((o) => {
                        return (
                            <OutputContent
                                o={o}
                                updateOutputAnnotation={updateOutputAnnotation}
                                deleteOutputAnnotation={deleteOutputAnnotation}
                            />
                        )
                    })}
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

export const BrowserOutputs: React.FC<Props> = ({
    browserOutputs,
    currentProject,
    vscode,
    addToBundle,
    removeFromBundle,
    annotatingOutput,
    setAnnotatingOutput,
}) => {
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
                        setAnnotatingOutput={setAnnotatingOutput}
                        annotatingOutput={annotatingOutput}
                    />
                ))}
        </div>
    )
}
