import * as React from 'react'
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

import { OldAnchorOnCommit, PastVersions } from './pastVersions'
import { PotentialVersions } from './potentialVersions'

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
        // if (priorVersions) {
        //     console.log('hewwo??', currentAnchorObject)
        const pseudoPriorVersion: AnchorOnCommit =
            createAnchorOnCommitFromAnchorObject(currentAnchorObject)
        console.log('psedi', pseudoPriorVersion)
        // const foundCurrentAnchorToDisplay: boolean =
        //     priorVersions.find((pv) => pv.id === pseudoPriorVersion.id)
        //         ?.id === pseudoPriorVersion.id
        // console.log('found', foundCurrentAnchorToDisplay)
        setPastVersions(
            // foundCurrentAnchorToDisplay
            //     ?
            [
                // ...priorVersions.filter(
                //     (a) => a.id !== pseudoPriorVersion.id
                // ),
                ...priorVersions,
                pseudoPriorVersion,
            ]
            // : //priorVersions.concat(pseudoPriorVersion)
            //   priorVersions
        )
        pastVersions && setIndex(pastVersions?.length - 1)
        // }
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

    // only handles frontend options

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* PRIOR VERISONS  */}
            {pastVersions ? (
                <PastVersions
                    pastVersions={pastVersions}
                    handleClick={handleClick}
                    displayBefore={displayBefore}
                    displayAfter={displayAfter}
                />
            ) : // <div style={{ display: 'flex', flexDirection: 'row' }}>
            //     <AdamiteButton
            //         buttonClicked={back}
            //         name="Back"
            //         icon={
            //             <ArrowBackIcon
            //                 style={
            //                     showBack
            //                         ? undefined
            //                         : { color: disabledIcon }
            //                 }
            //             />
            //         }
            //         noMargin={true}
            //         disabled={!showBack}
            //     />
            //     <div
            //         className={styles['AnchorContainer']}
            //         style={{
            //             minWidth: 50,
            //             maxWidth: 800,
            //             height: 150,
            //         }} // cannot move dimensions to CSS file or else package styles override
            //     >
            //         <Carousel // not sure how to resolve type issue yet 'JSX element type 'Slider' does not have any construct or call signatures.'
            //             onSlideComplete={(i: any) => {
            //                 setIndex(i)
            //             }}
            //             onSlideStart={(i: any) => {}}
            //             activeIndex={index}
            //             // threshHold={50} // min # of pixels dragged to trigger swipe
            //             transition={0.5}
            //             scaleOnDrag={true}
            //         >
            //             {pastVersions &&
            //                 pastVersions.map(
            //                     (pv: AnchorOnCommit, index) => (
            //                         <div
            //                             style={{
            //                                 display: 'flex',
            //                                 flexDirection: 'column',
            //                                 alignItems: 'flex-start',
            //                                 width: '100%',
            //                                 height: 150,
            //                                 padding: '10px',
            //                                 color: iconColor,
            //                             }} // same as AnchorContainer ^^
            //                             key={index}
            //                             onClick={(e) => {
            //                                 handleClick(
            //                                     e,
            //                                     currentAnchorObject.anchorId
            //                                 )
            //                             }}
            //                         >
            //                             <span>
            //                                 <i> {pv.path} </i>
            //                             </span>
            //                             {pv.endLine - pv.startLine > 0 ? (
            //                                 <span>
            //                                     lines {pv.startLine + 1}-
            //                                     {pv.endLine + 1} on{' '}
            //                                     {pv.branchName}{' '}
            //                                     {pv.commitHash !== ''
            //                                         ? ':'
            //                                         : null}{' '}
            //                                     {pv.commitHash.slice(0, 7)}
            //                                 </span>
            //                             ) : (
            //                                 <span>
            //                                     line {pv.startLine + 1} on{' '}
            //                                     {pv.branchName}
            //                                     {pv.commitHash !== ''
            //                                         ? ':'
            //                                         : null}{' '}
            //                                     {pv.commitHash.slice(0, 6)}
            //                                 </span>
            //                             )}
            //                             <div
            //                                 style={{
            //                                     display: 'flex',
            //                                     flexDirection: 'column',
            //                                 }}
            //                             >
            //                                 <div
            //                                     style={{
            //                                         display: 'flex',
            //                                         flexDirection: 'column',
            //                                         width: 'fit-content',
            //                                         alignItems:
            //                                             'flex-start',
            //                                         color: '#2ADD42',
            //                                         overflow: 'scroll',
            //                                     }}
            //                                 >
            //                                     <p
            //                                         style={{
            //                                             opacity: '0.5',
            //                                         }}
            //                                     >
            //                                         {displayBefore(pv, 3)}
            //                                     </p>
            //                                     <p
            //                                         style={{
            //                                             opacity: '0.7',
            //                                         }}
            //                                     >
            //                                         {displayBefore(pv, 2)}
            //                                     </p>
            //                                     <p>
            //                                         {/* <b> */}
            //                                         {displayAnchorText(pv)}
            //                                         {/* </b> */}
            //                                     </p>
            //                                     <p
            //                                         style={{
            //                                             opacity: '0.7',
            //                                         }}
            //                                     >
            //                                         {displayAfter(pv, 1)}
            //                                     </p>
            //                                     <p
            //                                         style={{
            //                                             opacity: '0.5',
            //                                         }}
            //                                     >
            //                                         {displayAfter(pv, 2)}
            //                                     </p>
            //                                     {/* styling html within carousel hard */}
            //                                     {/* <div
            //                     dangerouslySetInnerHTML={{
            //                         __html: pv.html,
            //                     }}
            //                     style={{
            //                         cursor: 'normal',
            //                     }}
            //                 ></div> */}
            //                                 </div>
            //                             </div>
            //                         </div>
            //                     )
            //                 )}
            //         </Carousel>
            //     </div>
            //     <AdamiteButton
            //         buttonClicked={forward}
            //         name="Forward"
            //         icon={
            //             <ArrowForwardIcon
            //                 style={
            //                     showForward
            //                         ? undefined
            //                         : { color: disabledIcon }
            //                 }
            //             />
            //         }
            //         noMargin={true}
            //         disabled={!showForward}
            //     />
            // </div>
            null}
            {/* POTENTIAL VERSIONS  */}
            {/* {potentialVersions ? (
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
            ) : null} */}
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
