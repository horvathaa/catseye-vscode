/*
 *
 * anchorVersions.tsx
 * Component that renders all annotation anchors in a carousel view - swipable if prior versions exists
 *
 */
import * as React from 'react'
import '../../styles/versions.module.css'
import {
    AnchorObject,
    PotentialAnchorObject,
    ReanchorInformation,
} from '../../../../constants/constants'
import Carousel from './anchorCarousel'

interface Props {
    anchors: AnchorObject[]
    scrollInEditor: (id: string) => void
    requestReanchor: (newAnchor: ReanchorInformation) => void
}

const AnchorVersions: React.FC<Props> = ({
    anchors,
    scrollInEditor,
    requestReanchor,
}) => {
    const [showSuggestions, setShowSuggestions] = React.useState<boolean>(true)

    const showPotentialAnchors = (anchor: AnchorObject): React.ReactElement => {
        const unanchorText = (
            <p
                style={{ padding: '0 5px' }}
                onClick={() => setShowSuggestions(!showSuggestions)}
            >
                {showSuggestions
                    ? 'Hide Suggestions'
                    : 'Unanchored! Show Suggestions'}
            </p>
        )

        return (
            <>
                {unanchorText}
                {showSuggestions && (
                    <Carousel
                        key={anchor.anchorId + '-reanchor'}
                        potentialVersions={anchor.potentialReanchorSpots}
                        currentAnchorObject={anchor}
                        scrollInEditor={scrollInEditor}
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
                        <>
                            <Carousel
                                key={anchor.anchorId + i + '-pv'}
                                priorVersions={anchor.priorVersions}
                                currentAnchorObject={anchor}
                                scrollInEditor={scrollInEditor}
                                // requestReanchor={requestReanchor} - consider supporting reanchor for prior versions?
                            ></Carousel>
                            {anchor.potentialReanchorSpots &&
                            anchor.potentialReanchorSpots.length
                                ? showPotentialAnchors(anchor)
                                : null}
                        </>
                    )
                }
                return null
            })}
        </div>
    )
}

export default AnchorVersions
