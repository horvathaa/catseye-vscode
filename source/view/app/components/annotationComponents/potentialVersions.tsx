import * as React from 'react'
import styles from '../../styles/versions.module.css'
import {
    PotentialAnchorObject,
    HIGH_SIMILARITY_THRESHOLD, // we are pretty confident the anchor is here
    PASSABLE_SIMILARITY_THRESHOLD,
} from '../../../../constants/constants' // we are confident enough } from '../../../../constants/constants'
import Carousel from 'react-material-ui-carousel' // https://www.npmjs.com/package/react-material-ui-carousel

interface PotentialVersionProps {
    handleClick: (e: React.SyntheticEvent, aId: string) => void
    displayBefore: (pv: PotentialAnchorObject, i: number) => string
    displayAfter: (pv: PotentialAnchorObject, i: number) => string
    handleRemoveSuggestion: (pv: PotentialAnchorObject) => void
    handleReanchor: (pv: PotentialAnchorObject) => void
    potentialVersion?: PotentialAnchorObject
    index?: number
}

const PotentialVersion: React.FC<PotentialVersionProps> = ({
    handleClick,
    potentialVersion,
    index,
    displayBefore,
    displayAfter,
    handleReanchor,
    handleRemoveSuggestion,
}) => {
    const getConfidenceString = (weight: number): string => {
        return weight <= HIGH_SIMILARITY_THRESHOLD
            ? 'very similar'
            : weight <= PASSABLE_SIMILARITY_THRESHOLD
            ? 'similar'
            : 'weak'
    }
    return (
        <div style={{}}>
            <div
                className={`${styles['AnchorContainer']} ${styles['Suggestion']}`}
                key={potentialVersion.anchorId + index}
                onClick={(e) => {
                    handleClick(e, potentialVersion.anchorId)
                }}
            >
                <span>
                    <i>
                        {' '}
                        {getConfidenceString(potentialVersion.weight)} match in{' '}
                        {potentialVersion.visiblePath}
                    </i>
                </span>
                {potentialVersion.anchor.endLine -
                    potentialVersion.anchor.startLine >
                0 ? (
                    <span>
                        found {potentialVersion.reasonSuggested} at lines{' '}
                        {potentialVersion.anchor.startLine + 1}-
                        {potentialVersion.anchor.endLine + 1}
                    </span>
                ) : (
                    <span>
                        found {potentialVersion.reasonSuggested} at line{' '}
                        {potentialVersion.anchor.startLine + 1}
                    </span>
                )}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        className={`${styles['AnchorCode']} ${styles['Suggestion']}`}
                    >
                        <p style={{ opacity: '0.5' }}>
                            {displayBefore(potentialVersion, 3)}
                        </p>
                        <p style={{ opacity: '0.7' }}>
                            {displayBefore(potentialVersion, 2)}
                        </p>
                        <p>
                            <b>
                                {potentialVersion.anchorText.length > 60
                                    ? potentialVersion.anchorText.slice(0, 60)
                                    : potentialVersion.anchorText}
                                {potentialVersion.anchorText.length > 60
                                    ? '...'
                                    : null}
                            </b>
                        </p>
                        <p style={{ opacity: '0.7' }}>
                            {displayAfter(potentialVersion, 1)}
                        </p>
                        <p style={{ opacity: '0.5' }}>
                            {displayAfter(potentialVersion, 2)}
                        </p>
                    </div>
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: '5px',
                }}
            >
                <button
                    className={styles['remove']}
                    onClick={(e: React.SyntheticEvent) => {
                        e.stopPropagation()
                        handleRemoveSuggestion(potentialVersion)
                    }}
                >
                    Remove Suggestion
                </button>
                <button
                    className={styles['reanchor']}
                    onClick={(e: React.SyntheticEvent) => {
                        e.stopPropagation()
                        handleReanchor(potentialVersion) // TO DO
                    }}
                >
                    Reanchor
                </button>
            </div>
        </div>
    )
}

interface PotentialVersionsProps extends PotentialVersionProps {
    potentialVersions: PotentialAnchorObject[]
}

export const PotentialVersions: React.FC<PotentialVersionsProps> = ({
    potentialVersions,
    handleClick,
    displayBefore,
    displayAfter,
    handleReanchor,
    handleRemoveSuggestion,
}) => {
    return (
        <Carousel autoPlay={false}>
            {potentialVersions.map((pv: PotentialAnchorObject, index) => {
                return (
                    <PotentialVersion
                        handleClick={handleClick}
                        index={index}
                        potentialVersion={pv}
                        displayBefore={displayBefore}
                        displayAfter={displayAfter}
                        handleReanchor={handleReanchor}
                        handleRemoveSuggestion={handleRemoveSuggestion}
                    />
                )
            })}
        </Carousel>
    )
}
