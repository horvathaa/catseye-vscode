import * as React from 'react'

import '../../styles/versions.module.css'

import {
    AnchorObject,
    AnchorOnCommit,
    PotentialAnchorObject,
} from '../../../../constants/constants'

import { PastVersions } from './pastVersions'
import { PotentialVersions } from './potentialVersions'

interface Props {
    priorVersions?: AnchorOnCommit[]
    potentialVersions?: PotentialAnchorObject[]
    currentAnchorObject: AnchorObject
    handleSelected: (id: string) => void
}

const AnchorCarousel: React.FC<Props> = ({
    priorVersions,
    potentialVersions,
    currentAnchorObject,
    handleSelected,
}) => {
    const [pastVersions, setPastVersions] = React.useState<
        AnchorOnCommit[] | undefined
    >(priorVersions)

    const [futureVersions, setFutureVersions] = React.useState<
        PotentialAnchorObject[] | undefined
    >(potentialVersions)

    // const [potentialVersion, setPotentialVersion] =
    //     React.useState<PotentialAnchorObject | null>(null) not sure why we have this and futureVersions?

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

    console.log('currentAnchrObject', currentAnchorObject)

    const handleClick = (e: React.SyntheticEvent, aId: string): void => {
        e.stopPropagation()
        if (pastVersions && index === pastVersions.length - 1)
            handleSelected(aId)
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

    const handleRemoveSuggestion = (pv: PotentialAnchorObject): void => {
        console.log('todo')
    }

    const handleReanchor = (pv: PotentialAnchorObject): void => {
        console.log('todo')
    }

    // only handles frontend options

    console.log('pastVersions', pastVersions)

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* PRIOR VERISONS  */}
            {priorVersions ? (
                <PastVersions
                    pastVersions={pastVersions}
                    handleClick={handleClick}
                    displayBefore={displayBefore}
                    displayAfter={displayAfter}
                />
            ) : null}
            {/* POTENTIAL VERSIONS -- lot of redundant code between this and prior versions - should fix */}
            {potentialVersions ? (
                <PotentialVersions
                    potentialVersions={futureVersions}
                    handleClick={handleClick}
                    displayBefore={displayBefore}
                    displayAfter={displayAfter}
                    handleReanchor={handleReanchor}
                    handleRemoveSuggestion={handleRemoveSuggestion}
                />
            ) : null}
        </div>
    )
}

export default AnchorCarousel
