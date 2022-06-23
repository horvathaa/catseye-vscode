/*
 *
 * anchorList.tsx
 * Component which renders all of the annotation's anchors.
 *
 */
import * as React from 'react'
import cn from 'classnames'
import styles from '../../styles/annotation.module.css'
import { AnchorObject } from '../../../../constants/constants'
import { VscChevronUp, VscChevronDown } from 'react-icons/vsc'
import { Tooltip } from '@material-ui/core'
import Anchor from './anchor'
interface Props {
    anchors: AnchorObject[]
    snapshotCode: (id: string) => void
    scrollInEditor: (id: string) => void
}

const AnchorList: React.FC<Props> = ({
    anchors,
    snapshotCode,
    scrollInEditor,
}) => {
    const [showingAnchors, setShowingAnchors] = React.useState<boolean>(true)

    const expandCollapseAnchorList = () => {
        return showingAnchors ? (
            <div
                className={`${styles['AnchorListButtonContainer']} ${styles['AnchorButtonContainer']}`}
            >
                <Tooltip title="Collapse Anchors">
                    <div>
                        <VscChevronUp
                            className={styles['IconContainer']}
                            onClick={() => setShowingAnchors(false)}
                        />
                    </div>
                </Tooltip>
            </div>
        ) : (
            <div
                className={`${styles['AnchorListButtonContainer']} ${styles['AnchorButtonContainer']}`}
            >
                <Tooltip title="Expand Anchors">
                    <div>
                        <VscChevronDown
                            className={styles['IconContainer']}
                            onClick={() => setShowingAnchors(true)}
                        />
                    </div>
                </Tooltip>
            </div>
        )
    }

    return (
        <div
            className={cn({ [styles.AnchorListContainer]: anchors.length > 1 })}
        >
            {showingAnchors ? (
                anchors.map((a: AnchorObject) => {
                    return (
                        <Anchor
                            key={a.parentId + a.anchorId}
                            anchorId={a.anchorId}
                            html={a.html}
                            anchorPreview={a.anchorPreview}
                            visiblePath={a.visiblePath}
                            startLine={a.anchor.startLine}
                            endLine={a.anchor.endLine}
                            scrollInEditor={scrollInEditor}
                            snapshotCode={snapshotCode}
                            originalCode={a.originalCode}
                        />
                    )
                })
            ) : (
                <Anchor
                    key={anchors[0].parentId + anchors[0].anchorId}
                    anchorId={anchors[0].anchorId}
                    html={anchors[0].html}
                    anchorPreview={anchors[0].anchorPreview}
                    visiblePath={anchors[0].visiblePath}
                    startLine={anchors[0].anchor.startLine}
                    endLine={anchors[0].anchor.endLine}
                    scrollInEditor={scrollInEditor}
                    snapshotCode={snapshotCode}
                    originalCode={anchors[0].originalCode}
                />
            )}
            {anchors.length > 1 && expandCollapseAnchorList()}
        </div>
    )
}

export default AnchorList
