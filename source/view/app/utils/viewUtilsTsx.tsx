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
        ? `Hide ${obj.length} ${obj.length === 1 ? subject : plural}`
        : `Show ${obj.length} ${obj.length === 1 ? subject : plural}`
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
