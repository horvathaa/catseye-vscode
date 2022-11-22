import * as React from 'react'
import {
    Annotation,
    BrowserOutput as BrowserOutputInterface,
    isBrowserOutput,
    isWebSearchEvent,
    Bundle as BundleInterface,
    BundleItemTypes,
    BundleItem,
} from '../../../constants/constants'
import ReactAnnotation from './annotation'
// import { BrowserOutput } from './browserOutputs'
import { SearchEvent } from './searchEvents'
import styles from '../styles/browserOutputs.module.css'
import TextEditor from './annotationComponents/textEditor'
import CatseyeButton from './annotationComponents/CatseyeButton'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'

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
    const [internalBundle, setInternalBundle] = React.useState<
        Map<string, string>
    >(new Map())
    const [editingBundle, setEditingBundle] = React.useState<
        Map<string, boolean>
    >(new Map())

    React.useEffect(() => {
        let newMap = new Map()
        let newEditMap = new Map()
        bundle.objs.forEach((o) => {
            internalBundle.has(o.id)
                ? newMap.set(o.id, internalBundle.get(o.id))
                : newMap.set(o.id, '')
            editingBundle.has(o.id)
                ? newEditMap.set(o.id, editingBundle.get(o.id))
                : newEditMap.set(o.id, true)
        })
        setInternalBundle(newMap)
        setEditingBundle(newEditMap)
    }, [bundle])

    return (
        <div
            className={`${styles['p2']} ${styles['m2']} ${styles['border-1px-medium']} ${styles['border-radius-8']}`}
        >
            <div
                className={`${styles['flex']} ${styles['justify-content-space-between']}`}
            >
                <h2 className={`${styles['p2']}`}>Bundle</h2>
                <CatseyeButton
                    buttonClicked={() => {
                        const convertedBundleArray = Array.from(
                            internalBundle,
                            ([key, value]): BundleItem => {
                                const obj = bundle.objs.find(
                                    (o) => o.id === key
                                )
                                if (!obj)
                                    return {
                                        id: '',
                                        type: BundleItemTypes['Unknown'],
                                        annotation: '',
                                    }
                                const type = Annotation.isAnnotation(obj)
                                    ? BundleItemTypes['Annotation']
                                    : isBrowserOutput(obj)
                                    ? BundleItemTypes['BrowserOutput']
                                    : isWebSearchEvent(obj)
                                    ? BundleItemTypes['WebSearchEvent']
                                    : BundleItemTypes['Unknown']
                                return { id: key, type, annotation: value }
                            }
                        )
                        // console.log('hewwo???', convertedBundleArray)
                        vscode.postMessage({
                            command: 'saveBundle',
                            bundle: convertedBundleArray,
                        })
                    }}
                    name="Save"
                    icon={<SaveIcon fontSize="small" />}
                />
            </div>
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
                    <></>
                ) : // <BrowserOutput
                //     browserOutput={o}
                //     currentProject={currentProject}
                //     transmitUpdatedOutput={transmitUpdatedOutput}
                //     addToBundle={removeFromBundle}
                //     removeFromBundle={removeFromBundle}
                // />
                isWebSearchEvent(o) ? (
                    <SearchEvent
                        searchEvent={o}
                        addToBundle={removeFromBundle}
                        removeFromBundle={removeFromBundle}
                    />
                ) : null
                const editContent =
                    editingBundle.has(o.id) &&
                    editingBundle.get(o.id) === true ? (
                        <TextEditor
                            content={internalBundle.get(o.id)}
                            submissionHandler={(newContent) => {
                                setInternalBundle(
                                    new Map(
                                        internalBundle.set(o.id, newContent)
                                    )
                                )
                                setEditingBundle(
                                    new Map(editingBundle.set(o.id, false))
                                )
                            }}
                            showSplitButton={false}
                            cancelHandler={() =>
                                setEditingBundle(
                                    new Map(editingBundle.set(o.id, false))
                                )
                            }
                        />
                    ) : (
                        <div
                            className={`${styles['p2']} ${styles['m2']} ${styles['flex']} ${styles['justify-content-space-between']}`}
                        >
                            <div>{internalBundle.get(o.id)}</div>
                            <div>
                                <CatseyeButton
                                    buttonClicked={() =>
                                        setEditingBundle(
                                            new Map(
                                                editingBundle.set(o.id, true)
                                            )
                                        )
                                    }
                                    name="Edit"
                                    icon={<EditIcon fontSize="small" />}
                                />
                                <CatseyeButton
                                    buttonClicked={() =>
                                        setInternalBundle(
                                            new Map(
                                                internalBundle.set(o.id, '')
                                            )
                                        )
                                    }
                                    name="Delete"
                                    icon={<DeleteIcon fontSize="small" />}
                                />
                            </div>
                        </div>
                    )
                return (
                    <div key={o.id + '-bundle'}>
                        {component}
                        {editContent}
                    </div>
                )
            })}
        </div>
    )
}
