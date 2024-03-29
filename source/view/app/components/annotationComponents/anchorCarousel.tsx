import * as React from 'react'
import {
    AnchorObject,
    AnchorOnCommit,
    PotentialAnchorObject,
    isPotentialAnchorObject,
    ReanchorInformation,
    Anchor,
} from '../../../../constants/constants'

import { PastVersions } from './pastVersions'
import { PotentialVersions } from './potentialVersions'
import { TbAnchor, TbAnchorOff } from 'react-icons/tb'
import { IconButton, Tooltip } from '@mui/material'
import { catseyeGreen } from '../../styles/vscodeStyles'

interface Props {
    priorVersions?: AnchorOnCommit[]
    potentialVersions?: PotentialAnchorObject[]
    currentAnchorObject: AnchorObject
    // handleSelected: (id: string) => void

    scrollInEditor: (id: string) => void
    scrollToRange: (anchor: Anchor, filename: string, gitUrl: string) => void
    requestReanchor?: (newAnchor: ReanchorInformation) => void
}

export const createAnchorOnCommitFromAnchorObject = (
    currentAnchorObject: AnchorObject
): AnchorOnCommit => {
    return {
        id: currentAnchorObject.anchorId,
        commitHash: '',
        createdTimestamp: currentAnchorObject.createdTimestamp,
        html: currentAnchorObject.html,
        anchorText: currentAnchorObject.anchorText,
        branchName: currentAnchorObject.gitBranch,
        anchor: currentAnchorObject.anchor,
        stableGitUrl: currentAnchorObject.stableGitUrl,
        path: currentAnchorObject.visiblePath,
        surroundingCode: currentAnchorObject.surroundingCode,
        anchorType: currentAnchorObject.anchorType,
    }
}

const AnchorCarousel: React.FC<Props> = ({
    priorVersions,
    potentialVersions,
    currentAnchorObject,
    // handleSelected,
    scrollInEditor,
    scrollToRange,
    requestReanchor,
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
            const pseudoPriorVersion: AnchorOnCommit =
                createAnchorOnCommitFromAnchorObject(currentAnchorObject)
            setPastVersions([...priorVersions, pseudoPriorVersion])
        } else if (!potentialVersions) {
            setPastVersions([
                createAnchorOnCommitFromAnchorObject(currentAnchorObject),
            ])
        }
        pastVersions && setIndex(pastVersions?.length - 1)
    }, [currentAnchorObject]) //watch for any changes to current anchor and update

    const handleClick = (e: React.SyntheticEvent, aId: string): void => {
        e.stopPropagation()
        const pv =
            potentialVersions &&
            potentialVersions.find((a) => a.anchorId === aId) // ???
        if (pv && isPotentialAnchorObject(pv)) {
            scrollToRange(pv.anchor, pv.filename, pv.stableGitUrl)
        }
        if (pastVersions && index === pastVersions.length - 1)
            scrollInEditor(aId)
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
            return lineBefore
            // return tooLong ? lineBefore.slice(0, 60).concat('...') : lineBefore
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
            // const length = lineAfter.length
            // const tooLong = length > 60
            // return tooLong ? lineAfter.slice(0, 60) : lineAfter
            return lineAfter
        }
        return null
    }

    // const handleRemoveSuggestion = (pv: PotentialAnchorObject): void => {
    //     console.log('todo')
    // }

    // // this is in my branch
    // const handleReanchor = (pv: PotentialAnchorObject): void => {
    //     console.log('todo')
    // }

    // only handles frontend options
    const handleRemoveSuggestion = (
        removedAnchor: PotentialAnchorObject | null
    ) => {
        const removedAFuture =
            futureVersions &&
            futureVersions.filter((pv: PotentialAnchorObject) => {
                return removedAnchor?.anchorId !== pv.anchorId
            })

        setFutureVersions(removedAFuture)
    }

    // why "null" as an option for removedAnchor?
    const handleReanchor = (removedAnchor: PotentialAnchorObject | null) => {
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

    // only handles frontend options

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* <div style={{ display: 'flex', flexDirection: 'row' }}>
                {/* PRIOR VERISONS  */}
            {/* {} */}
            {pastVersions ? (
                <PastVersions
                    pastVersions={pastVersions}
                    handleClick={handleClick}
                    displayBefore={displayBefore}
                    displayAfter={displayAfter}
                    anchorIcon={
                        currentAnchorObject.readOnly ? (
                            <Tooltip title={'Read-Only Anchor'}>
                                <div
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid gray',
                                        height: 'fit-content',
                                    }}
                                >
                                    <IconButton size="small">
                                        <TbAnchor
                                            style={{ color: catseyeGreen }}
                                        />
                                    </IconButton>
                                </div>
                            </Tooltip>
                        ) : currentAnchorObject.anchored ? (
                            <Tooltip title={'Currently anchored'}>
                                <IconButton size="small">
                                    <TbAnchor />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title={'Un-anchored'}>
                                <IconButton size="small">
                                    <TbAnchorOff />
                                </IconButton>
                            </Tooltip>
                        )
                    }
                />
            ) : null}
            {/* </div> */}
            {/* POTENTIAL VERSIONS  */}

            {/* POTENTIAL VERSIONS -- lot of redundant code between this and prior versions - should fix */}
            {potentialVersions ? (
                <PotentialVersions
                    potentialVersions={futureVersions ?? []}
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
