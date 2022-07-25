import * as React from 'react'
import Slider from 'react-touch-drag-slider' //https://github.com/bushblade/react-touch-drag-slider
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { IconButton } from '@material-ui/core'
import '../../styles/versions.module.css'
import styles from '../../styles/versions.module.css'
import { AnchorOnCommit } from '../../../../constants/constants'
import { iconColor } from '../../styles/vscodeStyles'

interface Props {
    priorVersions: AnchorOnCommit[]
}

const AnchorCarousel: React.FC<Props> = ({ priorVersions }) => {
    const [index, setIndex] = React.useState(priorVersions.length - 1)
    const [showBack, setShowBack] = React.useState(false)
    const [showForward, setShowForward] = React.useState(false)

    React.useEffect(() => {
        if (index > 0) {
            setShowBack(true)
        }
        if (index < priorVersions.length - 1) {
            setShowForward(true)
        }
        if (index === 0) {
            setShowBack(false)
        }
        if (index === priorVersions.length - 1) {
            setShowForward(false)
        }
    }, [index])

    const forward = () => {
        if (index === priorVersions.length - 1) setShowForward(false)
        if (index < priorVersions.length - 1) {
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

    return (
        <div
            className={styles['AnchorContainer']}
            style={{ minWidth: 50, height: 100 }} // cannot move dimensions to CSS file or else package styles override
        >
            {showBack ? (
                <IconButton onClick={back}>
                    <ArrowBackIcon />
                </IconButton>
            ) : null}
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
                {priorVersions.map((pv: AnchorOnCommit, index) => (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            width: '100%',
                            height: 100,
                            padding: '10px, 1px',
                            color: iconColor,
                        }} // same as AnchorContainer ^^
                        key={index}
                    >
                        <span>
                            <i> {pv.path} </i>
                        </span>
                        {pv.endLine - pv.startLine > 1 ? (
                            <span>
                                lines {pv.startLine}-{pv.endLine} on{' '}
                                {pv.branchName} : {pv.commitHash.slice(0, 6)}
                            </span>
                        ) : (
                            <span>
                                line {pv.startLine} on {pv.branchName} :{' '}
                                {pv.commitHash.slice(0, 6)}
                            </span>
                        )}

                        <div
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            <p>{pv.anchorText}</p>
                        </div>
                    </div>
                ))}
            </Slider>
            {showForward ? (
                <IconButton onClick={forward}>
                    <ArrowForwardIcon />
                </IconButton>
            ) : null}
        </div>
    )
}

export default AnchorCarousel
