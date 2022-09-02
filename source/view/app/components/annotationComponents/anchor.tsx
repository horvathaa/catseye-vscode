/*
 *
 * anchor.tsx
 * Component which contains the anchor.
 * Uses dangerously set innerHTML since the HTML to style the code like VS Code is generated by Shiki and
 * we want to use that style.
 *
 */
import * as React from 'react'
import styles from '../../styles/annotation.module.css'
import { Tooltip } from '@material-ui/core'
import { VscChevronLeft, VscChevronRight } from 'react-icons/vsc'
interface SynProps {
    html: string
    anchorPreview?: string
    collapsed?: boolean
}

export const Syntax: React.FC<SynProps> = ({
    html,
    anchorPreview,
    // collapsed,
}) => {
    // if (collapsed && anchorPreview) {
    //     return <code dangerouslySetInnerHTML={{ __html: anchorPreview }}></code>
    // } else
    if (anchorPreview) {
        return <code dangerouslySetInnerHTML={{ __html: html }}></code>
    } else {
        return (
            <code
                dangerouslySetInnerHTML={{ __html: html }}
                style={{ cursor: 'normal' }}
            ></code>
        )
    }
}

interface Props {
    html: string
    anchorId: string
    anchorPreview: string
    visiblePath: string
    startLine: number
    endLine: number
    scrollInEditor: (id: string) => void
    snapshotCode: (id: string) => void
    originalCode: string
}

const Anchor: React.FC<Props> = ({
    html,
    anchorId,
    anchorPreview,
    visiblePath,
    startLine,
    endLine,
    scrollInEditor,
    // snapshotCode,
    originalCode,
}) => {
    // const [collapsed, setCollapsed] = React.useState<boolean>(false)
    const [showingOriginalCode, setShowingOriginalCode] =
        React.useState<boolean>(false)

    const collapseExpandOriginalCode = (): React.ReactElement<any> => {
        return showingOriginalCode ? (
            <div className={styles['arrowBox']}>
                <Tooltip title="Show Current Code">
                    <div>
                        <VscChevronLeft
                            onClick={(e: React.SyntheticEvent) => {
                                e.stopPropagation()
                                setShowingOriginalCode(!showingOriginalCode)
                            }}
                            className={styles['IconContainer']}
                        />
                    </div>
                </Tooltip>
            </div>
        ) : (
            <div className={styles['arrowBox']}>
                <Tooltip title="Show Original Code">
                    <div>
                        <VscChevronRight
                            onClick={(e: React.SyntheticEvent) => {
                                e.stopPropagation()
                                setShowingOriginalCode(!showingOriginalCode)
                            }}
                            className={styles['IconContainer']}
                        />
                    </div>
                </Tooltip>
            </div>
        )
    }

    const handleShowInEditor = (e: React.SyntheticEvent): void => {
        e.stopPropagation()
        if (!showingOriginalCode) scrollInEditor(anchorId)
    }

    return (
        <div className={styles['AnchorContainer']}>
            <div className={styles['AnchorDescription']}>
                <i>{visiblePath}</i>
            </div>
            <div
                className={styles['HTMLContainer']}
                onClick={handleShowInEditor}
            >
                {showingOriginalCode ? (
                    <React.Fragment>
                        <Syntax html={originalCode} />
                        {collapseExpandOriginalCode()}
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <Syntax
                            html={html}
                            anchorPreview={anchorPreview}
                            // collapsed={collapsed}
                        />
                        {collapseExpandOriginalCode()}
                    </React.Fragment>
                )}
            </div>
            <div className={styles['AnchorDescription']}>
                <i>
                    {endLine - startLine + 1}{' '}
                    {endLine - startLine > 0 ? 'Lines' : 'Line'}
                </i>
            </div>
        </div>
    )
}

export default Anchor
