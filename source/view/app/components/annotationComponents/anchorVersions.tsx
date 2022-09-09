/*
 *
 * anchorVersions.tsx
 * Component that renders all annotation anchors in a carousel view - swipable if prior versions exists
 *
 */
import * as React from 'react'
// import '../../styles/versions.module.css'
import {
    Anchor,
    AnchorObject,
    ReanchorInformation,
} from '../../../../constants/constants'
import Carousel from './anchorCarousel'
import styles from '../../styles/versions.module.css'
import CatseyeButton from './CatseyeButton'
import AnchorIcon from '@mui/icons-material/Anchor'
interface Props {
    anchors: AnchorObject[]
    scrollInEditor: (id: string) => void
    requestReanchor: (newAnchor: ReanchorInformation) => void
    scrollToRange: (anchor: Anchor, filename: string, gitUrl: string) => void
    requestManualReanchor: (oldAnchor: AnchorObject) => void
}

const AnchorVersions: React.FC<Props> = ({
    anchors,
    scrollInEditor,
    requestReanchor,
    scrollToRange,
    requestManualReanchor,
}) => {
    const [showSuggestions, setShowSuggestions] = React.useState<boolean>(true)

    React.useEffect(() => {}, [anchors])

    const showPotentialAnchors = (anchor: AnchorObject): React.ReactElement => {
        const unanchorText = (
            <p
                style={{ paddingBottom: 0 }}
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`${styles['SuggestionTitle']} ${styles['ReanchorTitle']}`}
            >
                {showSuggestions
                    ? 'Hide Suggestions'
                    : 'Unanchored! Show Suggestions'}
            </p>
        )

        return (
            <>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    {unanchorText}{' '}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {' '}
                        Manually Reanchor{' '}
                        <CatseyeButton
                            buttonClicked={() => requestManualReanchor(anchor)}
                            name="Manually Reanchor"
                            icon={<AnchorIcon fontSize="small" />}
                            style={{ paddingLeft: '4px' }}
                        />
                    </div>
                </div>
                {showSuggestions && (
                    <Carousel
                        key={anchor.anchorId + '-reanchor'}
                        potentialVersions={anchor.potentialReanchorSpots}
                        currentAnchorObject={anchor}
                        scrollInEditor={scrollInEditor}
                        scrollToRange={scrollToRange}
                        requestReanchor={requestReanchor}
                    ></Carousel>
                )}
            </>
        )
    }

    return (
        <div>
            {anchors.map((anchor: AnchorObject, i) => {
                anchor.priorVersions && anchor.priorVersions.reverse()
                if (anchor.priorVersions) {
                    return (
                        <div key={'map-' + i}>
                            <Carousel
                                key={
                                    anchor.anchorId +
                                    anchor.parentId +
                                    i +
                                    '-pv'
                                }
                                priorVersions={anchor.priorVersions}
                                currentAnchorObject={anchor}
                                scrollInEditor={scrollInEditor}
                                scrollToRange={scrollToRange}
                            ></Carousel>

                            {anchor.potentialReanchorSpots &&
                            anchor.potentialReanchorSpots.length &&
                            !anchor.anchored
                                ? showPotentialAnchors(anchor)
                                : null}
                        </div>
                    )
                }
                return null
            })}
        </div>
    )
}

export default AnchorVersions
