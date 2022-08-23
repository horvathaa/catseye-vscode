/*
 *
 * anchorVersions.tsx
 * Component that renders all annotation anchors in a carousel view - swipable if prior versions exists
 *
 */
import * as React from 'react'
import '../../styles/versions.module.css'
import {
    Anchor,
    AnchorObject,
    PotentialAnchorObject,
    ReanchorInformation,
} from '../../../../constants/constants'
import Carousel from './anchorCarousel'
import styles from '../../styles/versions.module.css'
interface Props {
    anchors: AnchorObject[]
    scrollInEditor: (id: string) => void
    requestReanchor: (newAnchor: ReanchorInformation) => void
    scrollToRange: (anchor: Anchor, filename: string, gitUrl: string) => void
}

const AnchorVersions: React.FC<Props> = ({
    anchors,
    scrollInEditor,
    requestReanchor,
    scrollToRange,
}) => {
    const [showSuggestions, setShowSuggestions] = React.useState<boolean>(true)

    const showPotentialAnchors = (anchor: AnchorObject): React.ReactElement => {
        const unanchorText = (
            <p
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={styles['SuggestionTitle']}
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
                        <>
                            <Carousel
                                key={anchor.anchorId + i + '-pv'}
                                // potentialVersions={
                                //     anchor.potentialReanchorSpots
                                // }
                                priorVersions={anchor.priorVersions}
                                currentAnchorObject={anchor}
                                // handleSelected={scrollInEditor}

                                scrollInEditor={scrollInEditor}
                                scrollToRange={scrollToRange}
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
