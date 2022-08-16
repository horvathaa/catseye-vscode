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
    isPotentialAnchorObject,
    HIGH_SIMILARITY_THRESHOLD, // we are pretty confident the anchor is here
    PASSABLE_SIMILARITY_THRESHOLD, // we are confident enough
    ReanchorInformation,
    AnchorType,
    Anchor,
} from '../../../../constants/constants'
import {
    disabledIcon,
    iconColor,
    vscodeBorderColor,
} from '../../styles/vscodeStyles'
import AdamiteButton from './AdamiteButton'

interface Props {
    priorVersions?: AnchorOnCommit[]
    potentialVersions?: PotentialAnchorObject[]
    currentAnchorObject: AnchorObject
    scrollInEditor: (id: string) => void
    scrollToRange: (anchor: Anchor, filename: string, gitUrl: string) => void
    requestReanchor?: (newAnchor: ReanchorInformation) => void
}

const AnchorCarousel: React.FC<Props> = ({
    priorVersions,
    potentialVersions,
    currentAnchorObject,
    scrollInEditor,
    scrollToRange,
    requestReanchor,
}) => {
    const Carousel = Slider as unknown as React.ElementType
    const [pastVersions, setPastVersions] = React.useState<
        AnchorOnCommit[] | undefined
    >(priorVersions)

    const [futureVersions, setFutureVersions] = React.useState<
        PotentialAnchorObject[] | undefined
    >(potentialVersions)

    const [potentialVersion, setPotentialVersion] =
        React.useState<PotentialAnchorObject | null>(null)

    const [index, setIndex] = React.useState<number>(0)

    React.useEffect(() => {
        pastVersions && setIndex(pastVersions?.length - 1)
        futureVersions && setIndex(0)
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
                anchorType: currentAnchorObject.anchorType,
            }
            const foundCurrentAnchorToDisplay: boolean =
                priorVersions.find((pv) => pv.id === pseudoPriorVersion.id)
                    ?.id === pseudoPriorVersion.id

            setPastVersions(
                foundCurrentAnchorToDisplay
                    ? priorVersions.concat(pseudoPriorVersion)
                    : priorVersions
            )
            pastVersions && setIndex(pastVersions?.length - 1)
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

    // change to support navigating to potential re-anchor points
    const handleClick = (
        e: React.SyntheticEvent,
        aId: string,
        pv: PotentialAnchorObject | undefined = undefined
    ): void => {
        e.stopPropagation()
        if (pv && isPotentialAnchorObject(pv)) {
            scrollToRange(pv.anchor, pv.filename, pv.stableGitUrl)
        }
        if (pastVersions && index === pastVersions.length - 1)
            scrollInEditor(aId)
    }

    const getConfidenceString = (weight: number): string => {
        return weight <= HIGH_SIMILARITY_THRESHOLD
            ? 'very similar'
            : weight <= PASSABLE_SIMILARITY_THRESHOLD
            ? 'similar'
            : 'weak'
    }

    const displayBefore = (
        pv: AnchorOnCommit | PotentialAnchorObject,
        index: number
    ) => {
        if (
            pv.surroundingCode?.linesBefore &&
            index < pv.surroundingCode?.linesBefore?.length
        ) {
            const lineBefore =
                pv.surroundingCode?.linesBefore[
                    pv.surroundingCode?.linesBefore?.length - index
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
        if (
            pv.surroundingCode?.linesAfter &&
            index < pv.surroundingCode?.linesAfter.length
        ) {
            const lineAfter = pv.surroundingCode.linesAfter[index]
            const length = lineAfter.length
            const tooLong = length > 60
            return tooLong ? lineAfter.slice(0, 60) : lineAfter
        }
        return null
    }

    const displayAnchorText = (
        pv: AnchorOnCommit | PotentialAnchorObject
    ): React.ReactElement => {
        switch (pv.anchorType) {
            case AnchorType.partialLine:
                const wholeLine: string = pv.surroundingCode.linesAfter[0]
                const indexOfAnchor = wholeLine.indexOf(pv.anchorText)
                const endIndx = indexOfAnchor + pv.anchorText.length
                const partialLines = [
                    wholeLine.slice(0, indexOfAnchor),
                    wholeLine.slice(indexOfAnchor, endIndx),
                    wholeLine.slice(endIndx),
                ]
                return (
                    <>
                        {partialLines.map((a, i) => {
                            if (i !== 1) {
                                return (
                                    <span
                                        className={styles.codeStyle}
                                        style={{ opacity: '0.825' }}
                                    >
                                        {a}
                                    </span>
                                )
                            } else {
                                return <b className={styles.codeStyle}>{a}</b>
                            }
                        })}
                    </>
                )
            case AnchorType.oneline:
                return (
                    <>
                        {' '}
                        {pv.anchorText.length > 60
                            ? pv.anchorText.slice(0, 60)
                            : pv.anchorText}
                        {pv.anchorText.length > 60 ? '...' : null}
                    </>
                )
            case AnchorType.multiline:
                const multiLines = pv.anchorText.split('\n')
                return (
                    <>
                        {multiLines.map((a) => {
                            return (
                                <p>
                                    <b>
                                        {a.length > 60
                                            ? a.slice(0, 60) + '...'
                                            : a}
                                    </b>
                                </p>
                            )
                        })}
                    </>
                )
            default:
                return <b>{pv.anchorText}</b>
        }
    }

    // only handles frontend options
    const handleRemoveSuggestion = (
        removedAnchor: PotentialAnchorObject | null
    ) => {
        const removedAFuture =
            futureVersions &&
            futureVersions.filter((pv: PotentialAnchorObject) => {
                return removedAnchor?.anchorId !== pv.anchorId
            })
        // TODO: connect to backend
        setFutureVersions(removedAFuture)
    }

    // why "null" as an option for removedAnchor?
    const handleReanchor = (removedAnchor: PotentialAnchorObject | null) => {
        console.log('removedAnchor', removedAnchor)
        if (requestReanchor && removedAnchor) {
            const reanchor: ReanchorInformation = {
                anchor: removedAnchor.anchor,
                anchorId: removedAnchor.anchorId,
                stableGitUrl: removedAnchor.stableGitUrl,
                filename: removedAnchor.filename,
                path: removedAnchor.path,
                gitUrl: removedAnchor.gitUrl,
                anchorText: removedAnchor.anchorText,
                surroundingCode: removedAnchor.surroundingCode,
            }
            requestReanchor(reanchor)
        }
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
                    <AdamiteButton
                        buttonClicked={back}
                        name="Back"
                        icon={
                            <ArrowBackIcon
                                style={
                                    showBack
                                        ? undefined
                                        : { color: disabledIcon }
                                }
                            />
                        }
                        noMargin={true}
                        disabled={!showBack}
                    />
                    <div
                        className={styles['AnchorContainer']}
                        style={{
                            minWidth: 50,
                            maxWidth: 800,
                            height: 150,
                        }} // cannot move dimensions to CSS file or else package styles override
                    >
                        <Carousel // not sure how to resolve type issue yet 'JSX element type 'Slider' does not have any construct or call signatures.'
                            onSlideComplete={(i: any) => {
                                setIndex(i)
                            }}
                            onSlideStart={(i: any) => {}}
                            activeIndex={index}
                            // threshHold={50} // min # of pixels dragged to trigger swipe
                            transition={0.5}
                            scaleOnDrag={true}
                        >
                            {pastVersions &&
                                pastVersions.map(
                                    (pv: AnchorOnCommit, index) => (
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
                                                    {pv.endLine + 1} on{' '}
                                                    {pv.branchName}{' '}
                                                    {pv.commitHash !== ''
                                                        ? ':'
                                                        : null}{' '}
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
                                                        alignItems:
                                                            'flex-start',
                                                        color: '#2ADD42',
                                                        overflow: 'scroll',
                                                    }}
                                                >
                                                    <p
                                                        style={{
                                                            opacity: '0.5',
                                                        }}
                                                    >
                                                        {displayBefore(pv, 3)}
                                                    </p>
                                                    <p
                                                        style={{
                                                            opacity: '0.7',
                                                        }}
                                                    >
                                                        {displayBefore(pv, 2)}
                                                    </p>
                                                    <p>
                                                        {/* <b> */}
                                                        {displayAnchorText(pv)}
                                                        {/* </b> */}
                                                    </p>
                                                    <p
                                                        style={{
                                                            opacity: '0.7',
                                                        }}
                                                    >
                                                        {displayAfter(pv, 1)}
                                                    </p>
                                                    <p
                                                        style={{
                                                            opacity: '0.5',
                                                        }}
                                                    >
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
                                    )
                                )}
                        </Carousel>
                    </div>
                    <AdamiteButton
                        buttonClicked={forward}
                        name="Forward"
                        icon={
                            <ArrowForwardIcon
                                style={
                                    showForward
                                        ? undefined
                                        : { color: disabledIcon }
                                }
                            />
                        }
                        noMargin={true}
                        disabled={!showForward}
                    />
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
                    <Carousel // not sure how to resolve type issue yet 'JSX element type 'Carousel' does not have any construct or call signatures.'
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
                        {futureVersions &&
                            futureVersions.map(
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
                                            handleClick(e, pv.anchorId, pv)
                                        }}
                                    >
                                        <span>
                                            <i>
                                                {' '}
                                                {getConfidenceString(
                                                    pv.weight
                                                )}{' '}
                                                match in {pv.visiblePath}
                                            </i>
                                        </span>
                                        {pv.anchor.endLine -
                                            pv.anchor.startLine >
                                        0 ? (
                                            <span>
                                                found {pv.reasonSuggested} at
                                                lines {pv.anchor.startLine + 1}-
                                                {pv.anchor.endLine + 1}
                                            </span>
                                        ) : (
                                            <span>
                                                found {pv.reasonSuggested} at
                                                line {pv.anchor.startLine + 1}
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
                                                <p>{displayAnchorText(pv)}</p>
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
                    </Carousel>
                </div>
            ) : null}
            {potentialVersions ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: '5px',
                    }}
                >
                    <AdamiteButton
                        buttonClicked={back}
                        name="Back"
                        icon={
                            <ArrowBackIcon
                                style={
                                    showBack
                                        ? undefined
                                        : { color: disabledIcon }
                                }
                            />
                        }
                        noMargin={true}
                        disabled={!showBack}
                    />
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
                    <AdamiteButton
                        buttonClicked={forward}
                        name="Forward"
                        icon={
                            <ArrowForwardIcon
                                style={
                                    showForward
                                        ? undefined
                                        : { color: disabledIcon }
                                }
                            />
                        }
                        noMargin={true}
                        disabled={!showForward}
                    />
                </div>
            ) : null}
        </div>
    )
}

export default AnchorCarousel
