/*
 *
 * viewUtilsTsx.tsx
 * Random functions the webview can access for common render activities.
 *
 */
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc'
import * as React from 'react'
import styles from '../styles/annotation.module.css'

// toggle button used for expanding and collapsing replies, snapshots, etc.
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

// toggle button used for expanding and collapsing replies, snapshots, etc.
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
