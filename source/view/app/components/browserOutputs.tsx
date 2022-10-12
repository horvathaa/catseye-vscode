import { Edit } from '@mui/icons-material'
import * as React from 'react'
import { BrowserOutput } from '../../../constants/constants'
import styles from '../styles/browserOutputs.module.css'
import { cardStyle } from '../styles/vscodeStyles'
import { formatTimestamp } from '../utils/viewUtils'
import CatseyeButton from './annotationComponents/CatseyeButton'
import TextEditor from './annotationComponents/textEditor'

interface Props {
    browserOutputs: BrowserOutput[]
    currentProject: string
    vscode: any
}

interface OutputProps {
    browserOutput: BrowserOutput
    currentProject: string
    transmitUpdatedOutput: (bo: BrowserOutput) => void
}

const BrowserOutput: React.FC<OutputProps> = ({
    browserOutput,
    currentProject,
    transmitUpdatedOutput,
}) => {
    const [bo, setBo] = React.useState<BrowserOutput>(browserOutput)
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

    const { padding, paddingBottom, ...rest } = cardStyle
    return (
        <div
            style={rest}
            className={`${styles['m2']} ${styles['border-1px-medium']} ${styles['border-radius-8']} ${styles['flex-col']} ${styles['flex']} ${styles['justify-content-center']} ${styles['align-items-center']} ${styles['p2']}`}
        >
            <div className={`${styles['p2']} ${styles['align-self-start']}`}>
                Output generated at {formatTimestamp(bo.createdTimestamp)} while
                editing {currentProject}
            </div>
            <img className={`${styles['wh-80']}`} src={bo.data} alt={'data'} />

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
    )
}

export const BrowserOutputs: React.FC<Props> = ({
    browserOutputs,
    currentProject,
    vscode,
}) => {
    const transmitUpdatedOutput = (updatedBrowserOutput: BrowserOutput) => {
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
                    />
                ))}
        </div>
    )
}
