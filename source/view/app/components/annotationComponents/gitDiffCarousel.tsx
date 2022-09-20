import { GitDiffPathLog } from '../../../../constants/constants'
import {
    getActiveIndicatorIconProps,
    getIndicatorIconProps,
} from '../../utils/viewUtils'
import Carousel from 'react-material-ui-carousel'
import * as React from 'react'
import * as Diff2html from 'diff2html'
import styles from '../../styles/diff2html.module.css'

interface GitProps {
    gitDiff: GitDiffPathLog
}

const GitDiff: React.FC<GitProps> = ({ gitDiff }) => {
    const html = Diff2html.html(gitDiff.gitDiff, { drawFileList: true })
    return (
        <div>
            <div className={styles['d2h-wrapper']}>
                {gitDiff.simpleGit.author_name}
                {gitDiff.simpleGit.body}
            </div>
            <div dangerouslySetInnerHTML={{ __html: html }}></div>
        </div>
    )
}

interface Props {
    gitDiffPast: GitDiffPathLog[]
}

export const GitDiffCarousel: React.FC<Props> = ({ gitDiffPast }) => {
    return (
        <Carousel
            autoPlay={false}
            index={0}
            activeIndicatorIconButtonProps={{
                style: getActiveIndicatorIconProps(gitDiffPast),
            }}
            indicatorIconButtonProps={{
                style: getIndicatorIconProps(gitDiffPast),
            }}
        >
            {gitDiffPast.map((g) => {
                return <GitDiff gitDiff={g} />
            })}
        </Carousel>
    )
}
