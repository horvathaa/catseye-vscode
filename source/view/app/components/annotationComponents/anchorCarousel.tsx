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
    priorVersions: AnchorOnCommit[] | undefined
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
    const [index, setIndex] = React.useState(null)

    React.useEffect(() => {
        setIndex(allVersions.length - 1)
    }, [allVersions])

    React.useEffect(() => {
        // construct a pseudo pv object to represent the most up to date anchor object and add to allVersions array
        // const surrounding: SurroundingAnchorArea = {
        //     linesBefore:
        // }
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
            priorVersions.find((pv) => pv.id === pseudoPriorVersion.id).id ===
            pseudoPriorVersion.id

        setAllVersions(
            foundCurrentAnchorToDisplay
                ? priorVersions.concat(pseudoPriorVersion)
                : priorVersions
        )
        setIndex(allVersions.length - 1)
    }, [currentAnchorObject]) //watch for any changes to current anchor and update

    const [showBack, setShowBack] = React.useState(false)
    const [showForward, setShowForward] = React.useState(false)

    React.useEffect(() => {
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
        console.log('nav to anchor')
        e.stopPropagation()
        if (index === allVersions.length - 1) scrollInEditor(aId)
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
                    onSlideComplete={(i) => {
                        setIndex(i)
                    }}
                    onSlideStart={(i) => {}}
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
                                padding: '10px, 1px',
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
                                }}
                            >
                                <p style={{ opacity: '0.3' }}>
                                    {pv.surroundingCode.linesBefore[5]}
                                </p>
                                <p style={{ opacity: '0.5' }}>
                                    {pv.surroundingCode.linesBefore[4]}
                                </p>
                                <p>
                                    <b>
                                        {pv.anchorText.length > 30
                                            ? pv.anchorText.slice(0, 30)
                                            : pv.anchorText}
                                        {pv.anchorText.length > 30
                                            ? '...'
                                            : null}
                                    </b>
                                </p>
                                <p style={{ opacity: '0.5' }}>
                                    {pv.surroundingCode.linesAfter[0]}
                                </p>
                                <p style={{ opacity: '0.3' }}>
                                    {pv.surroundingCode.linesAfter[1]}
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
