import { AnchorOnCommit } from '../../../../constants/constants'
import * as React from 'react'
import { formatTimestamp } from '../../utils/viewUtils'
import Carousel from 'react-material-ui-carousel'
import styles from '../../styles/versions.module.css'

interface PastVersionProps {
    handleClick: (e: React.SyntheticEvent, aId: string) => void
    i: number
    pastVersion: AnchorOnCommit
    displayBefore: (pv: AnchorOnCommit, index: number) => string
    displayAfter: (pv: AnchorOnCommit, index: number) => string
}

export const PastVersion: React.FC<PastVersionProps> = ({
    pastVersion,
    i,
    handleClick,
    displayBefore,
    displayAfter,
}) => {
    return (
        <div
            key={pastVersion.id + i}
            onClick={(e) => {
                handleClick(e, pastVersion.id)
            }}
            className={styles['AnchorContainer']}
        >
            <span>
                <i> {pastVersion.path} </i>
            </span>
            {pastVersion.endLine - pastVersion.startLine > 0 ? (
                <span>
                    lines {pastVersion.startLine + 1}-{pastVersion.endLine + 1}{' '}
                    on {pastVersion.branchName}{' '}
                    {pastVersion.commitHash !== '' ? ':' : null}{' '}
                    {pastVersion.commitHash.slice(0, 7)}
                </span>
            ) : (
                <span>
                    line {pastVersion.startLine + 1} on {pastVersion.branchName}
                    {pastVersion.commitHash !== '' ? ':' : null}{' '}
                    {pastVersion.commitHash.slice(0, 6)}
                </span>
            )}
            <span>
                <i>made on {formatTimestamp(pastVersion.createdTimestamp)}</i>
            </span>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div className={styles['AnchorCode']}>
                    <p
                        style={{
                            opacity: '0.5',
                        }}
                    >
                        {displayBefore(pastVersion, 3)}
                    </p>
                    <p
                        style={{
                            opacity: '0.7',
                        }}
                    >
                        {displayBefore(pastVersion, 2)}
                    </p>
                    <p>
                        <b>
                            {pastVersion.anchorText.length > 60
                                ? pastVersion.anchorText.slice(0, 60)
                                : pastVersion.anchorText}
                            {pastVersion.anchorText.length > 60 ? '...' : null}
                        </b>
                    </p>
                    <p
                        style={{
                            opacity: '0.7',
                        }}
                    >
                        {displayAfter(pastVersion, 1)}
                    </p>
                    <p
                        style={{
                            opacity: '0.5',
                        }}
                    >
                        {displayAfter(pastVersion, 2)}
                    </p>
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
    return (
        <Carousel autoPlay={false}>
            {pastVersions.map((pv: AnchorOnCommit, index) => (
                <PastVersion
                    handleClick={handleClick}
                    i={index}
                    pastVersion={pv}
                    displayAfter={displayAfter}
                    displayBefore={displayBefore}
                />
            ))}
        </Carousel>
    )
}
