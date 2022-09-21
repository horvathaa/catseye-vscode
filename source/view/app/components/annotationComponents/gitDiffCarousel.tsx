import { GitDiffPathLog } from '../../../../constants/constants'
import {
    getActiveIndicatorIconProps,
    getIndicatorIconProps,
} from '../../utils/viewUtils'
import Carousel from 'react-material-ui-carousel'
import * as React from 'react'
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui-slim.js'
import { DiffFile } from 'diff2html/lib/types'
import styles from '../../styles/diff2html.module.css'
import { ThemeContext } from '../../catseye'

interface GitProps {
    gitDiff: GitDiffPathLog
    annoId: string
    anchorId: string
}

const formatDiff2Html = (gitDiff: DiffFile[], id: string): void => {
    const targetElement = document.getElementById(id)
    if (!targetElement) return
    const configuration = {
        drawFileList: false,
        highlight: true,
        renderNothingWhenEmpty: true,
    }
    const diff2htmlUi = new Diff2HtmlUI(targetElement, gitDiff, configuration)

    try {
        diff2htmlUi.draw()
        diff2htmlUi.highlightCode()
    } catch (error) {
        console.log('Could not draw: ', error)
    }
}

const GitDiff: React.FC<GitProps> = ({ gitDiff, annoId, anchorId }) => {
    const id = annoId + anchorId + gitDiff.simpleGit.hash
    const theme = React.useContext(ThemeContext)
    const darkMode = theme.kind === 2 ? `${styles['darkModeTheme']}` : ''
    React.useEffect(() => {
        formatDiff2Html(gitDiff.gitDiff, id)
    }, [gitDiff])

    return (
        <div>
            <div className={`${styles['p2']}`}>
                <div className={styles['flexSpaceBetween']}>
                    <div className={styles['font-500']}>
                        {gitDiff.simpleGit.author_name}
                    </div>
                    <div>{gitDiff.simpleGit.date}</div>
                </div>
                <div className={styles['font-14']}>
                    {gitDiff.simpleGit.message}
                </div>
            </div>{' '}
            <div
                className={`${styles['bg-white']} ${styles['p2']} ${darkMode}`}
                id={id}
            ></div>
        </div>
    )
}

interface Props {
    gitDiffPast: GitDiffPathLog[]
    annoId: string
    anchorId: string
}

export const GitDiffCarousel: React.FC<Props> = ({
    gitDiffPast,
    annoId,
    anchorId,
}) => {
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
                return (
                    <GitDiff
                        key={'diff-' + g.simpleGit.hash}
                        gitDiff={g}
                        annoId={annoId}
                        anchorId={anchorId}
                    />
                )
            })}
        </Carousel>
    )
}
