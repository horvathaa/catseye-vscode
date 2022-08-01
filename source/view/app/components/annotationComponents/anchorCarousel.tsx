import * as React from 'react'
import Slider from 'react-touch-drag-slider' //https://github.com/bushblade/react-touch-drag-slider
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { IconButton } from '@material-ui/core'
import '../../styles/versions.module.css'
import styles from '../../styles/versions.module.css'
import {
    AnchorObject,
    AnchorOnCommit,
    PotentialAnchorObject,
} from '../../../../constants/constants'
import { iconColor } from '../../styles/vscodeStyles'

interface Props {
    priorVersions?: AnchorOnCommit[]
    potentialVersions?: PotentialAnchorObject[] //prior or suggested version
    currentAnchorObject: AnchorObject
    scrollInEditor: (id: string) => void
}

const AnchorCarousel: React.FC<Props> = ({
    priorVersions,
    potentialVersions,
    currentAnchorObject,
    scrollInEditor,
}) => {
    const [pastVersions, setPastVersions] =
        React.useState<AnchorOnCommit[]>(priorVersions)

    const [futureVersions, setFutureVersions] =
        React.useState<PotentialAnchorObject[]>(potentialVersions)

    const [potentialVersion, setPotentialVersion] =
        React.useState<PotentialAnchorObject>(null)

    const [index, setIndex] = React.useState<number>(0)

    React.useEffect(() => {
        pastVersions ? setIndex(pastVersions.length - 1) : null
        futureVersions ? setIndex(0) : null
    }, [pastVersions, futureVersions])

    React.useEffect(() => {
        if (priorVersions) {
            const pseudoPriorVersion: AnchorOnCommit = {
                id: currentAnchorObject.anchorId,
                commitHash: '',
                createdTimestamp: currentAnchorObject.createdTimestamp,
                html: currentAnchorObject.html,
                anchorText: currentAnchorObject.anchorText,
                branchName: currentAnchorObject.gitBranch,
                startLine: currentAnchorObject.anchor.startLine,
                endLine: currentAnchorObject.anchor.endLine,
                path: currentAnchorObject.visiblePath,
                surroundingCode: currentAnchorObject.surroundingCode,
            }
            const foundCurrentAnchorToDisplay: boolean =
                priorVersions.find((pv) => pv.id === pseudoPriorVersion.id)
                    ?.id === pseudoPriorVersion.id

            setPastVersions(
                foundCurrentAnchorToDisplay
                    ? priorVersions.concat(pseudoPriorVersion)
                    : priorVersions
            )
            setIndex(pastVersions.length - 1)
        }
    }, [currentAnchorObject]) //watch for any changes to current anchor and update

    const [showBack, setShowBack] = React.useState(false)
    const [showForward, setShowForward] = React.useState(false)

    React.useEffect(() => {
        futureVersions ? setPotentialVersion(futureVersions[index]) : null
        if (index > 0) {
            setShowBack(true)
        }
        if (index === 0) {
            setShowBack(false)
        }

        if (
            (pastVersions && index < pastVersions.length - 1) ||
            (futureVersions && index < futureVersions.length - 1)
        ) {
            setShowForward(true)
        }
        if (
            (pastVersions && index === pastVersions.length - 1) ||
            (futureVersions && index === futureVersions.length - 1)
        ) {
            setShowForward(false)
        }
    }, [index])

    const forward = () => {
        if (
            (pastVersions && index === pastVersions.length - 1) ||
            (futureVersions && index === futureVersions.length - 1)
        )
            setShowForward(false)
        if (
            (pastVersions && index < pastVersions.length - 1) ||
            (futureVersions && index < futureVersions.length - 1)
        ) {
            setIndex(index + 1)
            setShowBack(true)
        }
    }

    const back = () => {
        if (index === 1) setShowBack(false)
        if (index > 0) {
            setIndex(index - 1)
            setShowForward(true)
        }
    }

    const handleClick = (e: React.SyntheticEvent, aId: string): void => {
        e.stopPropagation()
        if (index === pastVersions.length - 1) scrollInEditor(aId)
    }

    const displayBefore = (
        pv: AnchorOnCommit | PotentialAnchorObject,
        index: number
    ) => {
        if (index <= pv.surroundingCode.linesBefore.length) {
            const lineBefore =
                pv.surroundingCode.linesBefore[
                    pv.surroundingCode.linesBefore.length - index
                ]
            const length = lineBefore.length
            const tooLong = length > 60
            return tooLong ? lineBefore.slice(0, 60).concat('...') : lineBefore
        }
        return null
    }

    const displayAfter = (
        pv: AnchorOnCommit | PotentialAnchorObject,
        index: number //1
    ) => {
        if (index < pv.surroundingCode.linesAfter.length) {
            const lineAfter = pv.surroundingCode.linesAfter[index]
            const length = lineAfter.length
            const tooLong = length > 60
            return tooLong ? lineAfter.slice(0, 60) : lineAfter
        }
        return null
    }

    // only handles frontend options
    const handleRemoveSuggestion = (removedAnchor: PotentialAnchorObject) => {
        const removedAFuture = futureVersions.filter(
            (pv: PotentialAnchorObject) => {
                return removedAnchor.anchorId !== pv.anchorId
            }
        )
        setFutureVersions(removedAFuture)
    }

    const handleReanchor = (removedAnchor: PotentialAnchorObject) => {
        // reanchor at potential object
        // set annotation.anchored === true
        return
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* PRIOR VERISONS  */}
            {priorVersions ? (
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {showBack ? (
                        <IconButton onClick={back}>
                            <ArrowBackIcon />
                        </IconButton>
                    ) : null}
                    <div
                        className={styles['AnchorContainer']}
                        style={{
                            minWidth: 50,
                            maxWidth: 800,
                            height: 150,
                        }} // cannot move dimensions to CSS file or else package styles override
                    >
                        <Slider // not sure how to resolve type issue yet 'JSX element type 'Slider' does not have any construct or call signatures.'
                            onSlideComplete={(i: any) => {
                                setIndex(i)
                            }}
                            onSlideStart={(i: any) => {}}
                            activeIndex={index}
                            // threshHold={50} // min # of pixels dragged to trigger swipe
                            transition={0.5}
                            scaleOnDrag={true}
                        >
                            {pastVersions.map((pv: AnchorOnCommit, index) => (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        width: '100%',
                                        height: 150,
                                        padding: '10px',
                                        color: iconColor,
                                    }} // same as AnchorContainer ^^
                                    key={index}
                                    onClick={(e) => {
                                        handleClick(
                                            e,
                                            currentAnchorObject.anchorId
                                        )
                                    }}
                                >
                                    <span>
                                        <i> {pv.path} </i>
                                    </span>
                                    {pv.endLine - pv.startLine > 0 ? (
                                        <span>
                                            lines {pv.startLine + 1}-
                                            {pv.endLine + 1} on {pv.branchName}{' '}
                                            {pv.commitHash !== '' ? ':' : null}{' '}
                                            {pv.commitHash.slice(0, 7)}
                                        </span>
                                    ) : (
                                        <span>
                                            line {pv.startLine + 1} on{' '}
                                            {pv.branchName}
                                            {pv.commitHash !== ''
                                                ? ':'
                                                : null}{' '}
                                            {pv.commitHash.slice(0, 6)}
                                        </span>
                                    )}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                width: 'fit-content',
                                                alignItems: 'flex-start',
                                                color: '#2ADD42',
                                                overflow: 'scroll',
                                            }}
                                        >
                                            <p style={{ opacity: '0.5' }}>
                                                {displayBefore(pv, 3)}
                                            </p>
                                            <p style={{ opacity: '0.7' }}>
                                                {displayBefore(pv, 2)}
                                            </p>
                                            <p>
                                                <b>
                                                    {pv.anchorText.length > 60
                                                        ? pv.anchorText.slice(
                                                              0,
                                                              60
                                                          )
                                                        : pv.anchorText}
                                                    {pv.anchorText.length > 60
                                                        ? '...'
                                                        : null}
                                                </b>
                                            </p>
                                            <p style={{ opacity: '0.7' }}>
                                                {displayAfter(pv, 1)}
                                            </p>
                                            <p style={{ opacity: '0.5' }}>
                                                {displayAfter(pv, 2)}
                                            </p>
                                            {/* styling html within carousel hard */}
                                            {/* <div
                                    dangerouslySetInnerHTML={{
                                        __html: pv.html,
                                    }}
                                    style={{
                                        cursor: 'normal',
                                    }}
                                ></div> */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Slider>
                    </div>
                    {showForward ? (
                        <IconButton onClick={forward}>
                            <ArrowForwardIcon />
                        </IconButton>
                    ) : null}
                </div>
            ) : null}
            {/* POTENTIAL VERSIONS  */}
            {potentialVersions ? (
                <div
                    className={styles['AnchorContainer']}
                    style={{
                        minWidth: 50,
                        maxWidth: 800,
                        height: 150,
                    }} // cannot move dimensions to CSS file or else package styles override
                >
                    <Slider // not sure how to resolve type issue yet 'JSX element type 'Slider' does not have any construct or call signatures.'
                        onSlideComplete={(i: any) => {
                            setIndex(i)
                        }}
                        onSlideStart={(i: any) => {
                            // setPotentialVersion(futureVersions[index])
                        }}
                        activeIndex={index}
                        // threshHold={50} // min # of pixels dragged to trigger swipe
                        transition={0.5}
                        scaleOnDrag={true}
                    >
                        {futureVersions.map(
                            (pv: PotentialAnchorObject, index) => (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        width: '100%',
                                        height: 150,
                                        padding: '10px',
                                        color: iconColor,
                                    }} // same as AnchorContainer ^^
                                    key={index}
                                    onClick={(e) => {
                                        handleClick(e, pv.anchorId)
                                    }}
                                >
                                    <span>
                                        <i>
                                            {' '}
                                            {pv.weight * 100}% match in{' '}
                                            {pv.visiblePath}
                                        </i>
                                    </span>
                                    {pv.anchor.endLine - pv.anchor.startLine >
                                    0 ? (
                                        <span>
                                            found {pv.reasonSuggested} at lines{' '}
                                            {pv.anchor.startLine + 1}-
                                            {pv.anchor.endLine + 1}
                                        </span>
                                    ) : (
                                        <span>
                                            found {pv.reasonSuggested} at line{' '}
                                            {pv.anchor.startLine + 1}
                                        </span>
                                    )}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                width: 'fit-content',
                                                alignItems: 'flex-start',
                                                color: '#2ADD42',
                                                overflow: 'scroll',
                                            }}
                                        >
                                            <p style={{ opacity: '0.5' }}>
                                                {displayBefore(pv, 3)}
                                            </p>
                                            <p style={{ opacity: '0.7' }}>
                                                {displayBefore(pv, 2)}
                                            </p>
                                            <p>
                                                <b>
                                                    {pv.anchorText.length > 60
                                                        ? pv.anchorText.slice(
                                                              0,
                                                              60
                                                          )
                                                        : pv.anchorText}
                                                    {pv.anchorText.length > 60
                                                        ? '...'
                                                        : null}
                                                </b>
                                            </p>
                                            <p style={{ opacity: '0.7' }}>
                                                {displayAfter(pv, 1)}
                                            </p>
                                            <p style={{ opacity: '0.5' }}>
                                                {displayAfter(pv, 2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </Slider>
                </div>
            ) : null}
            {potentialVersions ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                    }}
                >
                    {showBack ? (
                        <IconButton onClick={back}>
                            <ArrowBackIcon />
                        </IconButton>
                    ) : null}
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
                    {showForward ? (
                        <IconButton onClick={forward}>
                            <ArrowForwardIcon />
                        </IconButton>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

export default AnchorCarousel
