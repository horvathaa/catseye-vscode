/*
 *
 * viewUtilsTsx.tsx
 * Random functions the webview can access for common render activities.
 *
 */
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc'
import * as React from 'react'
import styles from '../styles/annotation.module.css'
import { Groups } from '@mui/icons-material'
import PersonIcon from '@mui/icons-material/Person'
import {
    Annotation,
    Type,
    Option,
    AuthorOptions,
    FilterOptions,
    OptionGroup,
    AnchorOnCommit,
    PotentialAnchorObject,
    AnchorType,
} from '../../../constants/constants'
import { defaultSort, defaultScope } from '../utils/viewUtils'
import BugReportIcon from '@mui/icons-material/BugReport' // Issue
import TaskIcon from '@mui/icons-material/Task' // Task
import AssignmentIcon from '@mui/icons-material/Assignment' // Proposal
import { ContactSupport } from '@mui/icons-material'
import CodeOffIcon from '@mui/icons-material/CodeOff'

// toggle button used for expanding and collapsing snapshots, etc.
export const collapseExpandToggle = (
    showing: boolean,
    obj: any[],
    callback: (bool: boolean) => void,
    subject: string
): React.ReactElement<any> => {
    const plural: string = subject === 'reply' ? 'replies' : subject + 's'
    const subjectString: string = showing
        ? `Hide ${subject === 'reply' ? 'older' : obj.length} ${
              obj.length === 1 ? subject : plural
          }`
        : `Show ${subject === 'reply' ? 'older' : obj.length} ${
              obj.length === 1 ? subject : plural
          }`
    const icon: React.ReactElement<any> = !showing ? (
        <VscChevronRight className={styles['IconContainer']} />
    ) : (
        <VscChevronDown className={styles['IconContainer']} />
    )
    return (
        <div className={styles['replyShowHide']}>
            <div
                className={styles['collapseExpandButton']}
                onClick={(e: React.SyntheticEvent) => {
                    e.stopPropagation()
                    showing ? callback(false) : callback(true)
                }}
            >
                {subjectString} {icon}
            </div>
        </div>
    )
}

// textual button used for expanding and collapsing replies
export const showHideLine = (
    showing: boolean,
    length: number,
    callback: (bool: boolean) => void,
    subject: string
): React.ReactElement<any> => {
    const plural: string = subject === 'reply' ? 'replies' : subject + 's'
    const subjectString: string = showing
        ? `Hide ${length} older ${length === 1 ? subject : plural}`
        : `Show ${length} older ${length === 1 ? subject : plural}`
    return (
        <div
            className={styles['showHideLineContainer']}
            onClick={(e: React.SyntheticEvent) => {
                e.stopPropagation()
                showing ? callback(false) : callback(true)
            }}
        >
            <div className={styles['showHideLine']}></div>
            <div className={styles['showHideLineButton']}>{subjectString}</div>
        </div>
    )
}

export const defaultAuthorOptions: OptionGroup = {
    label: 'Author',
    options: [
        {
            name: AuthorOptions.mine,
            selected: true,
            icon: <PersonIcon fontSize="small" />,
        },
        {
            name: AuthorOptions.others,
            selected: true,
            icon: <Groups fontSize="small" />,
        },
    ],
}

export const defaultTypeOptions: OptionGroup = {
    label: 'Type',
    options: [
        {
            name: Type.issue,
            selected: true,
            icon: <BugReportIcon fontSize="small" />,
        },
        {
            name: Type.proposal,
            selected: true,
            icon: <AssignmentIcon fontSize="small" />,
        },
        {
            name: Type.task,
            selected: true,
            icon: <TaskIcon fontSize="small" />,
        },
        {
            name: Type.question,
            selected: true,
            icon: <ContactSupport fontSize="small" />,
        },
        {
            name: 'untyped',
            selected: true,
            icon: <CodeOffIcon fontSize="small" />,
        },
    ],
}

export const defaultFilterOptions: FilterOptions = {
    sort: defaultSort,
    authorOptions: defaultAuthorOptions,
    typeOptions: defaultTypeOptions,
    scope: defaultScope,
    searchText: '',
    showResolved: false,
    pinnedOnly: false,
    showProjectOnly: true,
}

// export const defaultTypeOptions: Option[] = [
//     {
//         name:
//     }
// ]

export const deleteAnnotation = (
    e: React.SyntheticEvent,
    vscode: any,
    anno: Annotation
): void => {
    e.stopPropagation()
    vscode.postMessage({
        command: 'deleteAnnotation',
        annoId: anno.id,
    })
}

export const resolveAnnotation = (
    e: React.SyntheticEvent,
    vscode: any,
    anno: Annotation
): void => {
    e.stopPropagation()
    vscode.postMessage({
        command: 'resolveAnnotation',
        annoId: anno.id,
    })
}

export const pinAnnotation = (
    e: React.SyntheticEvent,
    vscode: any,
    anno: Annotation
): void => {
    e.stopPropagation()
    // Maybe need to do more by updating whole view and SelectedAnnotationsNavigations?
    vscode.postMessage({
        command: 'updateAnnotation',
        annoId: anno.id,
        key: 'selected',
        value: !anno.selected,
    })
}

export const shareAnnotation = (
    e: React.SyntheticEvent,
    vscode: any,
    anno: Annotation
): void => {
    e.stopPropagation()
    vscode.postMessage({
        command: 'updateAnnotation',
        annoId: anno.id,
        key: 'sharedWith',
        value: 'group',
    })
}

export const mergeAnnotations = (
    e: React.SyntheticEvent,
    vscode: any,
    annos: Annotation[]
): void => {
    e.stopPropagation()

    // vscode.postMessage({
    //     command: 'resolveAnnotation',
    //     annoId: anno.id,
    // })
}

export const displayAnchorText = (
    pv: AnchorOnCommit | PotentialAnchorObject,
    styles: any
): React.ReactElement => {
    switch (pv.anchorType) {
        case AnchorType.partialLine:
            const wholeLine: string = pv.surroundingCode.linesAfter[0]
            const indexOfAnchor = wholeLine.indexOf(pv.anchorText)
            const endIndx = indexOfAnchor + pv.anchorText.length
            const partialLines = [
                wholeLine.slice(0, indexOfAnchor),
                wholeLine.slice(indexOfAnchor, endIndx),
                wholeLine.slice(endIndx),
            ]
            return (
                <>
                    {partialLines.map((a, i) => {
                        if (i !== 1) {
                            return (
                                <span
                                    className={styles.codeStyle}
                                    style={{ opacity: '0.825' }}
                                >
                                    {a}
                                </span>
                            )
                        } else {
                            return (
                                <b
                                    style={{ fontWeight: 600 }}
                                    className={styles.codeStyle}
                                >
                                    {a}
                                </b>
                            )
                        }
                    })}
                </>
            )
        case AnchorType.oneline:
            return (
                <>
                    {' '}
                    {pv.anchorText.length > 60
                        ? pv.anchorText.slice(0, 60)
                        : pv.anchorText}
                    {pv.anchorText.length > 60 ? '...' : null}
                </>
            )
        case AnchorType.multiline:
            const multiLines = pv.anchorText.split('\n')
            return (
                <>
                    {multiLines.map((a) => {
                        return (
                            <p>
                                <b
                                    style={{ fontWeight: 600 }}
                                    className={styles.codeStyle}
                                >
                                    {a.length > 60 ? a.slice(0, 60) + '...' : a}
                                </b>
                            </p>
                        )
                    })}
                </>
            )
        default:
            return (
                <b style={{ fontWeight: 600 }} className={styles.codeStyle}>
                    {pv.anchorText}
                </b>
            )
    }
}
