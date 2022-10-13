import * as React from 'react'
import {
    Annotation,
    BrowserOutput as BrowserOutputInterface,
    isBrowserOutput,
    isWebSearchEvent,
    Bundle as BundleInterface,
} from '../../../constants/constants'
import ReactAnnotation from './annotation'
import { BrowserOutput } from './browserOutputs'
import { SearchEvent } from './searchEvents'
import styles from '../styles/browserOutputs.module.css'

interface Props {
    bundle: BundleInterface
    vscode: any
    username: string
    window: Window
    userId: string
    currentProject: string
    transmitUpdatedOutput: (bo: BrowserOutputInterface) => void
    addToBundle: (o: any) => void
    removeFromBundle: (o: any) => void
}

export const Bundle: React.FC<Props> = ({
    bundle,
    vscode,
    username,
    window,
    userId,
    currentProject,
    transmitUpdatedOutput,
    addToBundle,
    removeFromBundle,
}) => {
    return (
        <div
            className={`${styles['p2']} ${styles['m2']} ${styles['border-1px-medium']} ${styles['border-radius-8']}`}
        >
            <h2>Bundle</h2>
            {bundle.objs.map((o) => {
                const component = Annotation.isAnnotation(o) ? (
                    <ReactAnnotation
                        annotation={o}
                        vscode={vscode}
                        username={username}
                        window={window}
                        userId={userId}
                    />
                ) : isBrowserOutput(o) ? (
                    <BrowserOutput
                        browserOutput={o}
                        currentProject={currentProject}
                        transmitUpdatedOutput={transmitUpdatedOutput}
                        addToBundle={removeFromBundle}
                        removeFromBundle={removeFromBundle}
                    />
                ) : isWebSearchEvent(o) ? (
                    <SearchEvent
                        searchEvent={o}
                        addToBundle={removeFromBundle}
                        removeFromBundle={removeFromBundle}
                    />
                ) : null
                return <div key={o.id + '-bundle'}>{component}</div>
            })}
        </div>
    )
}
