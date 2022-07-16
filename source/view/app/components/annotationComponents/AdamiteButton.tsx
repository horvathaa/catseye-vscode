/*
 *
 * authorOperationButtons.tsx
 * Component which contains buttons an annotation author can see on their annotation to edit or delete the annotation.
 *
 */
import * as React from 'react'
import styles from '../../styles/annotation.module.css'
import { Tooltip } from '@material-ui/core'

interface Props {
    buttonClicked: (e: React.SyntheticEvent) => void
    name: string
    icon: React.ReactElement
    noMargin?: boolean
}

const AdamiteButton: React.FC<Props> = ({
    buttonClicked = () => {},
    name,
    icon,
    noMargin: noMargin = false,
}) => {
    return (
        <React.Fragment>
            <div
                onClick={(e: React.SyntheticEvent) => {
                    e.stopPropagation()
                    buttonClicked(e)
                }}
                className={styles['DropdownItemOverwrite']}
            >
                <div
                    className={styles['DropdownIconsWrapper']}
                    style={
                        noMargin === true ? { marginRight: '0em' } : undefined
                    }
                >
                    <Tooltip title={`${name}`}>
                        <div>{icon}</div>
                    </Tooltip>
                </div>
            </div>
        </React.Fragment>
    )
}

export default AdamiteButton
