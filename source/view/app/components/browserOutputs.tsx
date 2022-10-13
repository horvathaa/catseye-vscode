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
}

interface OutputProps {
    browserOutput: BrowserOutputInterface
    currentProject: string
    transmitUpdatedOutput: (bo: BrowserOutputInterface) => void
    addToBundle: (obj: any) => void
    removeFromBundle: (obj: any) => void
}

export const BrowserOutput: React.FC<OutputProps> = ({
    browserOutput,
    currentProject,
    transmitUpdatedOutput,
    addToBundle,
    removeFromBundle,
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
            >
                <div
                    className={`${styles['p2']} ${styles['align-self-start']}`}
                >
                    Output generated at {formatTimestamp(bo.createdTimestamp)}{' '}
                    while editing {currentProject}
                </div>
                <img
                    className={`${styles['wh-80']}`}
                    src={bo.data}
                    alt={'data'}
                />

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

export const BrowserOutputs: React.FC<Props> = ({
    browserOutputs,
    currentProject,
    vscode,
    addToBundle,
    removeFromBundle,
}) => {
    const transmitUpdatedOutput = (
        updatedBrowserOutput: BrowserOutputInterface
    ) => {
        vscode.postMessage({
            command: 'updateBrowserOutput',
            browserOutput: updatedBrowserOutput,
        })
    }

    return (
        <div>
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
                    />
                ))}
        </div>
    )
}
