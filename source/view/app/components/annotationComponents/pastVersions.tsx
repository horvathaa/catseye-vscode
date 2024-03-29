import { AnchorOnCommit } from '../../../../constants/constants'
import * as React from 'react'
import {
    formatTimestamp,
    getActiveIndicatorIconProps,
    getIndicatorIconProps,
} from '../../utils/viewUtils'
import Carousel from 'react-material-ui-carousel'
import styles from '../../styles/versions.module.css'
import { displayAnchorText } from '../../utils/viewUtilsTsx'
// import { ExtendButtonBase, IconButtonTypeMap } from '@mui/material'
import { ReactJSXElement } from '@emotion/react/types/jsx-namespace'
import { ThemeContext } from '../../catseye'

interface PastVersionProps {
    handleClick: (e: React.SyntheticEvent, aId: string) => void
    i: number
    pastVersion: AnchorOnCommit | OldAnchorOnCommit
    displayBefore?: (pv: AnchorOnCommit, index: number) => string | null
    displayAfter?: (pv: AnchorOnCommit, index: number) => string | null
    mergeSelection?: boolean
    anchorIcon?: ReactJSXElement
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
    mergeSelection,
    anchorIcon,
}) => {
    const [pv, setPv] = React.useState<AnchorOnCommit>(pastVersion)
    const theme = React.useContext(ThemeContext)
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
            className={
                mergeSelection
                    ? `${styles['AnchorContainer']} ${styles['Selected']}`
                    : `${styles['AnchorContainer']}`
            }
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    cursor: 'default',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>
                        <i> {pv.path} </i>
                    </span>
                    {pv.anchor?.endLine - pv.anchor?.startLine > 0 ? (
                        <span>
                            lines {pv.anchor?.startLine + 1}-
                            {pv.anchor?.endLine + 1} on {pv.branchName}{' '}
                            {pv.commitHash !== '' ? ':' : null}{' '}
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
                        <i>created on {formatTimestamp(pv.createdTimestamp)}</i>
                    </span>
                </div>
                {anchorIcon ? anchorIcon : null}
            </div>
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
                            {displayAnchorText(pv, styles, theme)}
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
    displayBefore: (pv: AnchorOnCommit, index: number) => string | null
    displayAfter: (pv: AnchorOnCommit, index: number) => string | null
    anchorIcon: ReactJSXElement
}

export const PastVersions: React.FC<PastVersionsProps> = ({
    handleClick,
    displayBefore,
    displayAfter,
    pastVersions,
    anchorIcon,
}) => {
    const [versionsToRender, setVersionsToRender] = React.useState<
        AnchorOnCommit[]
    >([])
    // double check that this array is in the correct order
    // (i.e., last index === most recent)
    React.useEffect(() => {
        const versions: AnchorOnCommit[] = []
        pastVersions.forEach((currAnch, i) => {
            if (i === 0) {
                versions.push(currAnch)
            } else {
                if (
                    // tbd whether to lower case is a good check
                    // (maybe should leave since camelcasing may matter to some folks idk)
                    currAnch.anchorText.toLowerCase().replace(/\s+/g, '') !==
                    pastVersions[i - 1].anchorText
                        .toLowerCase()
                        .replace(/\s+/g, '')
                ) {
                    versions.push(currAnch)
                }
            }
        })
        setVersionsToRender(versions)
    }, [pastVersions])

    return (
        <>
            {/* {anchorIcon} */}
            <Carousel
                autoPlay={false}
                index={versionsToRender.length - 1}
                activeIndicatorIconButtonProps={{
                    style: getActiveIndicatorIconProps(versionsToRender),
                }}
                indicatorIconButtonProps={{
                    style: getIndicatorIconProps(versionsToRender),
                }}
            >
                {versionsToRender.map((pv: AnchorOnCommit, index) => {
                    return (
                        <PastVersion
                            key={pv.id + index + 'carousel'}
                            handleClick={handleClick}
                            i={index}
                            pastVersion={pv}
                            displayAfter={displayAfter}
                            displayBefore={displayBefore}
                            anchorIcon={anchorIcon}
                        />
                    )
                })}
            </Carousel>
        </>
    )
}
