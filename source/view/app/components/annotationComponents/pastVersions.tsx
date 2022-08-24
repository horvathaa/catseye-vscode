import { AnchorOnCommit } from '../../../../constants/constants'
import * as React from 'react'
import { formatTimestamp } from '../../utils/viewUtils'
import Carousel from 'react-material-ui-carousel'
import styles from '../../styles/versions.module.css'
import { displayAnchorText } from '../../utils/viewUtilsTsx'

interface PastVersionProps {
    handleClick: (e: React.SyntheticEvent, aId: string) => void
    i: number
    pastVersion: AnchorOnCommit | OldAnchorOnCommit
    displayBefore?: (pv: AnchorOnCommit, index: number) => string
    displayAfter?: (pv: AnchorOnCommit, index: number) => string
}

export interface OldAnchorOnCommit extends AnchorOnCommit {
    startLine: number
    endLine: number
}

export const isOldAnchorOnCommit = (
    anchor: any
): anchor is OldAnchorOnCommit => {
    return (
        anchor.hasOwnProperty('startLine') && anchor.hasOwnProperty('endLine')
    )
}

export const PastVersion: React.FC<PastVersionProps> = ({
    pastVersion,
    i,
    handleClick,
    displayBefore,
    displayAfter,
}) => {
    const [pv, setPv] = React.useState<AnchorOnCommit>(pastVersion)
    React.useEffect(() => {
        if (isOldAnchorOnCommit(pastVersion)) {
            const { startLine, endLine, ...rest } = pastVersion
            setPv({
                ...rest,
                anchor: {
                    startLine: pastVersion.startLine,
                    endLine: pastVersion.endLine,
                    startOffset: 0,
                    endOffset: 0,
                },
            })
        } else {
            setPv(pastVersion)
        }
    }, [pastVersion])

    const showBefore = (): React.ReactElement => {
        return (
            <>
                <pre
                    style={{
                        opacity: '0.5',
                    }}
                    className={styles['CodeLines']}
                >
                    {displayBefore && displayBefore(pv, 3)}
                </pre>
                <pre
                    className={styles['CodeLines']}
                    style={{
                        opacity: '0.7',
                    }}
                >
                    {displayBefore && displayBefore(pv, 2)}
                </pre>
            </>
        )
    }

    const showAfter = (): React.ReactElement => {
        return (
            <>
                <pre
                    className={styles['CodeLines']}
                    style={{
                        opacity: '0.7',
                    }}
                >
                    {displayAfter && displayAfter(pv, 1)}
                </pre>
                <pre
                    className={styles['CodeLines']}
                    style={{
                        opacity: '0.5',
                    }}
                >
                    {displayAfter && displayAfter(pv, 2)}
                </pre>
            </>
        )
    }

    return (
        <div
            key={pv.id + i}
            onClick={(e) => {
                handleClick(e, pv.id)
            }}
            className={styles['AnchorContainer']}
        >
            <span>
                <i> {pv.path} </i>
            </span>
            {pv.anchor?.endLine - pv.anchor?.startLine > 0 ? (
                <span>
                    lines {pv.anchor?.startLine + 1}-{pv.anchor?.endLine + 1} on{' '}
                    {pv.branchName} {pv.commitHash !== '' ? ':' : null}{' '}
                    {pv.commitHash.slice(0, 7)}
                </span>
            ) : (
                <span>
                    line {pv.anchor?.startLine + 1} on {pv.branchName}
                    {pv.commitHash !== '' ? ':' : null}{' '}
                    {pv.commitHash.slice(0, 6)}
                </span>
            )}
            <span>
                <i>made on {formatTimestamp(pv.createdTimestamp)}</i>
            </span>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'scroll',
                    maxHeight: '20vh',
                }}
            >
                <div className={styles['AnchorCode']}>
                    <pre className={styles['CodeLines']}>
                        {displayBefore && showBefore()}
                        <b>
                            {displayAnchorText(pv, styles)}
                            {/* {pv.anchorText.length > 60
                                ? pv.anchorText.slice(0, 60)
                                : pv.anchorText}
                            {pv.anchorText.length > 60 ? '...' : null} */}
                        </b>
                        {displayAfter && showAfter()}
                    </pre>
                </div>
            </div>
        </div>
    )
}

interface PastVersionsProps {
    pastVersions: AnchorOnCommit[]
    handleClick: (e: React.SyntheticEvent, aId: string) => void
    displayBefore: (pv: AnchorOnCommit, index: number) => string
    displayAfter: (pv: AnchorOnCommit, index: number) => string
}

export const PastVersions: React.FC<PastVersionsProps> = ({
    handleClick,
    displayBefore,
    displayAfter,
    pastVersions,
}) => {
    React.useEffect(() => {}, [pastVersions])

    return (
        <Carousel autoPlay={false} index={pastVersions.length - 1}>
            {pastVersions.map((pv: AnchorOnCommit, index) => {
                return (
                    <PastVersion
                        key={pv.id + index + 'carousel'}
                        handleClick={handleClick}
                        i={index}
                        pastVersion={pv}
                        displayAfter={displayAfter}
                        displayBefore={displayBefore}
                    />
                )
            })}
        </Carousel>
    )
}
