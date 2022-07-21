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
    SurroundingAnchorArea,
} from '../../../../constants/constants'
import { iconColor } from '../../styles/vscodeStyles'
// import { Anchor } from '@mui/icons-material'

interface Props {
    priorVersions: AnchorOnCommit[]
    currentAnchorObject: AnchorObject
    scrollInEditor: (id: string) => void
}

const AnchorCarousel: React.FC<Props> = ({
    priorVersions,
    currentAnchorObject,
    scrollInEditor,
}) => {
    const [allVersions, setAllVersions] =
        React.useState<AnchorOnCommit[]>(priorVersions)
    const [index, setIndex] = React.useState<number>(0)

    React.useEffect(() => {
        setIndex(allVersions.length - 1)
    }, [allVersions])

    React.useEffect(() => {
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
        console.log('pseudo', pseudoPriorVersion)

        console.log(
            'surroundingCodeTest',
            pseudoPriorVersion.surroundingCode.linesAfter[0]
        )
        const foundCurrentAnchorToDisplay: boolean =
            priorVersions.find((pv) => pv.id === pseudoPriorVersion.id)?.id ===
            pseudoPriorVersion.id

        setAllVersions(
            foundCurrentAnchorToDisplay
                ? priorVersions.concat(pseudoPriorVersion)
                : priorVersions
        )
        setIndex(allVersions.length - 1)
    }, [currentAnchorObject]) //watch for any changes to current anchor and update

    console.log('all versions', allVersions)
    const [showBack, setShowBack] = React.useState(false)
    const [showForward, setShowForward] = React.useState(false)

    React.useEffect(() => {
        if (index) {
            if (index > 0) {
                setShowBack(true)
            }
            if (index < allVersions.length - 1) {
                setShowForward(true)
            }
            if (index === 0) {
                setShowBack(false)
            }
            if (index === allVersions.length - 1) {
                setShowForward(false)
            }
        }
    }, [index])

    const forward = () => {
        if (index === allVersions.length - 1) setShowForward(false)
        if (index < allVersions.length - 1) {
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
        if (index === allVersions.length - 1) scrollInEditor(aId)
    }

    const displayBefore = (pv: AnchorOnCommit, index: number) => {
        const lineBefore =
            pv.surroundingCode.linesBefore[
                pv.surroundingCode.linesBefore.length - index
            ]
        const length = lineBefore.length
        const tooLong = length > 45
        return tooLong ? lineBefore.slice(0, 45).concat('...') : lineBefore
    }

    const displayAfter = (pv: AnchorOnCommit, index: number) => {
        const lineAfter = pv.surroundingCode.linesAfter[index]
        const length = lineAfter.length
        const tooLong = length > 45
        return tooLong ? lineAfter.slice(0, 45) : lineAfter
    }

    return (
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
                    {allVersions.map((pv: AnchorOnCommit, index) => (
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
                                handleClick(e, currentAnchorObject.anchorId)
                            }}
                        >
                            <span>
                                <i> {pv.path} </i>
                            </span>
                            {pv.endLine - pv.startLine > 0 ? (
                                <span>
                                    lines {pv.startLine + 1}-{pv.endLine + 1} on{' '}
                                    {pv.branchName}{' '}
                                    {pv.commitHash !== '' ? ':' : null}{' '}
                                    {pv.commitHash.slice(0, 7)}
                                </span>
                            ) : (
                                <span>
                                    line {pv.startLine + 1} on {pv.branchName}
                                    {pv.commitHash !== '' ? ':' : null}{' '}
                                    {pv.commitHash.slice(0, 6)}
                                </span>
                            )}

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
                                        {pv.anchorText.length > 45
                                            ? pv.anchorText.slice(0, 45)
                                            : pv.anchorText}
                                        {pv.anchorText.length > 45
                                            ? '...'
                                            : null}
                                    </b>
                                </p>
                                <p style={{ opacity: '0.7' }}>
                                    {displayAfter(pv, 0)}
                                </p>
                                <p style={{ opacity: '0.5' }}>
                                    {displayAfter(pv, 1)}
                                </p>
                                {/* styling within carousel doesn't work here */}
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
                    ))}
                </Slider>
            </div>
            {showForward ? (
                <IconButton onClick={forward}>
                    <ArrowForwardIcon />
                </IconButton>
            ) : null}
        </div>
    )
}

export default AnchorCarousel
