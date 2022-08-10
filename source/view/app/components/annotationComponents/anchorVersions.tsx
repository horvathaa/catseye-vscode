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
} from '../../../../constants/constants'
import Carousel from './anchorCarousel'

interface Props {
    anchors: AnchorObject[]
    scrollInEditor: (id: string) => void
}

const AnchorVersions: React.FC<Props> = ({ anchors, scrollInEditor }) => {
    // let dummyFuture: PotentialAnchorObject[] = [
    //     {
    //         weight: 0.5,
    //         reasonSuggested: 'similar text',
    //         anchor: {
    //             startLine: 2,
    //             endLine: 3,
    //             startOffset: 0,
    //             endOffset: 0,
    //         },
    //         anchorText: 'new place at const Hello',
    //         html: '',
    //         filename: '',
    //         gitUrl: '',
    //         stableGitUrl: '',
    //         visiblePath: 'diff.tsx',
    //         gitRepo: '',
    //         gitBranch: '',
    //         gitCommit: '',
    //         anchorPreview: '',
    //         programmingLang: '',
    //         anchorId: '123',
    //         originalCode: '',
    //         parentId: '',
    //         anchored: false,
    //         createdTimestamp: 0,
    //         surroundingCode: {
    //             linesBefore: ['b1', 'b2', 'b3', 'b4', 'b5'],
    //             linesAfter: ['a1', 'a2', 'a3', 'a4', 'a5'],
    //         },
    //     },
    //     {
    //         weight: 0.25,
    //         reasonSuggested: 'parent scope',
    //         anchor: {
    //             endLine: 15,
    //             endOffset: 17,
    //             startLine: 15,
    //             startOffset: 12,
    //         },
    //         anchorText: 'another new place at hello',
    //         html: '',
    //         filename: '',
    //         gitUrl: '',
    //         stableGitUrl: '',
    //         visiblePath: 'diff.tsx',
    //         gitRepo: '',
    //         gitBranch: '',
    //         gitCommit: '',
    //         anchorPreview: '',
    //         programmingLang: '',
    //         anchorId: '456',
    //         originalCode: '',
    //         parentId: '',
    //         anchored: false,
    //         createdTimestamp: 0,
    //         surroundingCode: {
    //             linesBefore: ['b1', 'b2', 'b3', 'b4', 'b5'],
    //             linesAfter: ['a1', 'a2', 'a3', 'a4', 'a5'],
    //         },
    //     },
    //     {
    //         weight: 0.1,
    //         reasonSuggested: 'proximity to original',
    //         anchor: {
    //             endLine: 15,
    //             endOffset: 17,
    //             startLine: 15,
    //             startOffset: 12,
    //         },
    //         anchorText: 'another new place at hello',
    //         html: '',
    //         filename: '',
    //         gitUrl: '',
    //         stableGitUrl: '',
    //         visiblePath: 'diff.tsx',
    //         gitRepo: '',
    //         gitBranch: '',
    //         gitCommit: '',
    //         anchorPreview: '',
    //         programmingLang: '',
    //         anchorId: '789',
    //         originalCode: '',
    //         parentId: '',
    //         anchored: false,
    //         createdTimestamp: 0,
    //         surroundingCode: {
    //             linesBefore: ['b1', 'b2', 'b3', 'b4', 'b5'],
    //             linesAfter: ['a1', 'a2', 'a3', 'a4', 'a5'],
    //         },
    //     },
    // ]
    const [showSuggestions, setShowSuggestions] = React.useState<boolean>(true)

    return (
        <div>
            {anchors.map((anchor: AnchorObject, i) => {
                anchor.priorVersions && anchor.priorVersions.reverse()
                if (anchor.priorVersions) {
                    return (
                        <Carousel
                            key={i}
                            priorVersions={anchor.priorVersions}
                            currentAnchorObject={anchor}
                            handleSelected={scrollInEditor}
                        ></Carousel>
                    )
                }
                return null
                // if (!anchor.anchored) {
                // return (
                // put show/hide here
                // )
                // }
                // return null
            })}
            <p
                style={{ padding: '0 5px' }}
                onClick={() => setShowSuggestions(!showSuggestions)}
            >
                {showSuggestions
                    ? 'Hide Suggestions'
                    : 'Unanchored! Show Suggestions'}
            </p>
            {showSuggestions &&
                anchors.map((anchor: AnchorObject, i) => {
                    // if (!anchor.anchored) {
                    return (
                        <Carousel
                            key={i}
                            potentialVersions={anchor.potentialReanchorSpots}
                            currentAnchorObject={anchor}
                            handleSelected={scrollInEditor}
                        ></Carousel>
                    )
                    // }
                    // return null
                })}
        </div>
    )
}

export default AnchorVersions
