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

    const simpleGitText = (
        <>
            <div
                className={`${styles['flexSpaceBetween']} ${
                    gitDiff.githubData && gitDiff.githubData.length
                        ? styles['commit-separator']
                        : ''
                }`}
            >
                <div className={styles['font-500']}>
                    {gitDiff.simpleGit.author_name}
                </div>
                <div>{gitDiff.simpleGit.date}</div>
            </div>
            <div className={styles['font-14']}>{gitDiff.simpleGit.message}</div>
        </>
    )

    const githubDataText = gitDiff.githubData
        ? gitDiff.githubData.map((g: any, i: number) => {
              const state =
                  g.state === 'closed' && g.merged_at ? 'merged' : g.state
              const pullRequestMetadata = (
                  <div>
                      Commit part of {state}{' '}
                      <a href={g.html_url}>pull request #{g.number}</a>
                  </div>
              )
              const timeText =
                  state === 'closed' || state === 'merged'
                      ? `-- ${state} at ${g.closed_at}`
                      : ''
              const processBodyText = function (body: string) {
                  const images = body.match(/!\[.*\]\(.*\)/g) ?? []
                  console.log('images', images)
                  const imgs = images?.map((i) => {
                      if (i) {
                          const src = i
                              .match(/\(.*\)/)[0]
                              .replace('(', '')
                              .replace(')', '')
                          console.log('src', src)
                          const alt = i
                              .match(/\[.*\]/)[0]
                              .replace('[', '')
                              .replace(']', '')
                          console.log('alt', alt)
                          return <img src={src} alt={alt}></img>
                      }
                      return <img src={''} alt={''} />
                  })
                  //   console.log('imgs', imgs)

                  const chunks = body.split(/!\[.*\]\(.*\)/g)
                  //   console.log('hewwo?', chunks)
                  return (
                      <div
                          style={{ whiteSpace: 'pre-wrap' }}
                          //   className={styles['img-wrap']}
                      >
                          {chunks.map((c, i) => {
                              console.log('c??', c)
                              return (
                                  <React.Fragment key={c}>
                                      <>{c}</>
                                      <>{imgs[i] ?? null}</>
                                  </React.Fragment>
                              )
                          })}
                      </div>
                  )
              }

              const processLinkedInfo = function (body: string) {
                  const issuesToPrint = gitDiff.linkedGithubData?.filter(
                      (l: any) => body.includes(`#${l.number}`)
                  )
                  return (
                      <div>
                          {issuesToPrint.map((issue: any) => {
                              const isPullRequest =
                                  issue.pull_request !== undefined
                              return (
                                  <>
                                      <div
                                          className={`${styles['flexSpaceBetween']}`}
                                      >
                                          <a href={issue.html_url}>
                                              <h4>
                                                  Linked{' '}
                                                  {isPullRequest
                                                      ? 'Pull Request'
                                                      : 'Issue'}{' '}
                                                  #{issue.number}
                                              </h4>
                                          </a>
                                          <div>
                                              Created by{' '}
                                              <a href={issue.user.html_url}>
                                                  {issue.user.login}
                                              </a>{' '}
                                              on {issue.created_at}
                                          </div>
                                      </div>
                                      <>{processBodyText(issue.body)}</>
                                  </>
                              )
                          })}
                      </div>
                  )
              }

              const pullRequestInfo = (
                  <>
                      Opened at {g.created_at} {timeText}
                      <div>
                          Created by{' '}
                          <a href={g.user.html_url}>{g.user.login}</a>
                      </div>
                      <h3>{g.title}</h3> {processBodyText(g.body)}
                  </>
              )

              return (
                  <div key={g.id + '-' + g.node_id + i}>
                      {pullRequestMetadata}
                      {pullRequestInfo}
                      {gitDiff.linkedGithubData
                          ? processLinkedInfo(g.body)
                          : null}
                  </div>
              )
          })
        : null

    return (
        <div>
            <div className={`${styles['p2']}`}>
                {githubDataText}
                {simpleGitText}
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
