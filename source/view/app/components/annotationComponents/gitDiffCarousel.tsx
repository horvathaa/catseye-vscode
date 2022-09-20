import { GitDiffPathLog } from '../../../../constants/constants'
import {
    getActiveIndicatorIconProps,
    getIndicatorIconProps,
} from '../../utils/viewUtils'
import Carousel from 'react-material-ui-carousel'
import * as React from 'react'
import * as Diff2html from 'diff2html'
import styles from '../../styles/diff2html.module.css'
// import '../../styles/diff2html.css'

interface GitProps {
    gitDiff: GitDiffPathLog
}

// <div>
//     <div className={'d2h-wrapper'}>
//         {gitDiff.simpleGit.author_name}
//         {gitDiff.simpleGit.body}
//     </div>
//     <div dangerouslySetInnerHTML={{ __html: html }}></div>
// </div>

const GitDiff: React.FC<GitProps> = ({ gitDiff }) => {
    const html = Diff2html.html(gitDiff.gitDiff, { drawFileList: true })
    console.log('gitDiff', gitDiff.gitDiff)
    // html
    return (
        <>
            <div className={styles['d2h-file-list-wrapper']}>
                <div className={styles['d2h-file-list-header']}>
                    <span className={styles['d2h-file-list-title']}>
                        Files changed (1)
                    </span>
                    {/* <a className={styles["d2h-file-switch d2h-hide"]}>hide</a>
                    <a className="d2h-file-switch d2h-show">show</a> */}
                </div>
                <ol className={styles['d2h-file-list']}>
                    <li className={styles['d2h-file-list-line']}>
                        <span className={styles['d2h-file-name-wrapper']}>
                            <svg
                                aria-hidden="true"
                                className={styles['d2h-icon d2h-changed']}
                                height="16"
                                version="1.1"
                                viewBox="0 0 14 16"
                                width="14"
                            >
                                <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM4 8c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"></path>
                            </svg>{' '}
                            <a
                                href="#d2h-032315"
                                className={styles['d2h-file-name']}
                            >
                                source/anchorFunctions/anchor.ts
                            </a>
                            <span className={styles['d2h-file-stats']}>
                                <span className={styles['d2h-lines-added']}>
                                    +2
                                </span>
                                <span className={styles['d2h-lines-deleted']}>
                                    -0
                                </span>
                            </span>
                        </span>
                    </li>
                </ol>
            </div>
            <div className={styles['d2h-wrapper']}>
                <div
                    id="d2h-032315"
                    className={styles['d2h-file-wrapper']}
                    data-lang="ts"
                >
                    <div className={styles['d2h-file-header']}>
                        <span className={styles['d2h-file-name-wrapper']}>
                            <svg
                                aria-hidden="true"
                                className={styles['d2h-icon']}
                                height="16"
                                version="1.1"
                                viewBox="0 0 12 16"
                                width="12"
                            >
                                <path d="M6 5H2v-1h4v1zM2 8h7v-1H2v1z m0 2h7v-1H2v1z m0 2h7v-1H2v1z m10-7.5v9.5c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h7.5l3.5 3.5z m-1 0.5L8 2H1v12h10V5z"></path>
                            </svg>{' '}
                            <span className={styles['d2h-file-name']}>
                                source/anchorFunctions/anchor.ts
                            </span>
                            <span
                                className={
                                    styles[
                                        'd2h-tag d2h-changed d2h-changed-tag'
                                    ]
                                }
                            >
                                CHANGED
                            </span>
                        </span>
                        {/* <label className={styles['d2h-file-collapse']}>
                            <input
                                className={styles['d2h-file-collapse-input']}
                                type="checkbox"
                                name="viewed"
                                value="viewed"
                            >
                                Viewed
                            </input>
                        </label> */}
                    </div>
                    <div className={styles['d2h-file-diff']}>
                        <div className={styles['d2h-code-wrapper']}>
                            <table className={styles['d2h-diff-table']}>
                                <tbody className={styles['d2h-diff-tbody']}>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-info'
                                                ]
                                            }
                                        ></td>
                                        <td className={styles['d2h-info']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                @@ -1,3 +1,5 @@
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-cntx'
                                                ]
                                            }
                                        >
                                            <div
                                                className={styles['line-num1']}
                                            >
                                                1
                                            </div>
                                            <div
                                                className={styles['line-num2']}
                                            >
                                                1
                                            </div>
                                        </td>
                                        <td className={styles['d2h-cntx']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-prefix'
                                                        ]
                                                    }
                                                >
                                                    &nbsp;
                                                </span>
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-ctn'
                                                        ]
                                                    }
                                                >
                                                    import * as vscode from
                                                    &#x27;vscode&#x27;;
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-cntx'
                                                ]
                                            }
                                        >
                                            <div
                                                className={styles['line-num1']}
                                            >
                                                2
                                            </div>
                                            <div
                                                className={styles['line-num2']}
                                            >
                                                2
                                            </div>
                                        </td>
                                        <td className={styles['d2h-cntx']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-prefix'
                                                        ]
                                                    }
                                                >
                                                    &nbsp;
                                                </span>
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-ctn'
                                                        ]
                                                    }
                                                >
                                                    import Annotation from
                                                    &#x27;..&#x2F;constants&#x2F;constants&#x27;;
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-cntx'
                                                ]
                                            }
                                        >
                                            <div
                                                className={styles['line-num1']}
                                            >
                                                3
                                            </div>
                                            <div
                                                className={styles['line-num2']}
                                            >
                                                3
                                            </div>
                                        </td>
                                        <td className={styles['d2h-cntx']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-prefix'
                                                        ]
                                                    }
                                                >
                                                    &nbsp;
                                                </span>
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-ctn'
                                                        ]
                                                    }
                                                >
                                                    import &#123;v4 as
                                                    uuidv4&#125; from
                                                    &#x27;uuid&#x27;;
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-ins'
                                                ]
                                            }
                                        >
                                            <div
                                                className={styles['line-num1']}
                                            ></div>
                                            <div
                                                className={styles['line-num2']}
                                            >
                                                4
                                            </div>
                                        </td>
                                        <td className={styles['d2h-ins']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-prefix'
                                                        ]
                                                    }
                                                >
                                                    +
                                                </span>
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-ctn'
                                                        ]
                                                    }
                                                >
                                                    import
                                                    &#123;buildAnnotation&#125;{' '}
                                                    from
                                                    &#x27;..&#x2F;utils&#x2F;utils&#x27;;
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-ins'
                                                ]
                                            }
                                        >
                                            <div
                                                className={styles['line-num1']}
                                            ></div>
                                            <div
                                                className={styles['line-num2']}
                                            >
                                                5
                                            </div>
                                        </td>
                                        <td className={styles['d2h-ins']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-prefix'
                                                        ]
                                                    }
                                                >
                                                    +
                                                </span>
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-ctn'
                                                        ]
                                                    }
                                                >
                                                    import &#123;user&#125; from
                                                    &#x27;..&#x2F;extension&#x27;;
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={
                                                styles[
                                                    'd2h-code-linenumber d2h-cntx'
                                                ]
                                            }
                                        >
                                            <div
                                                className={styles['line-num1']}
                                            >
                                                4
                                            </div>
                                            <div
                                                className={styles['line-num2']}
                                            >
                                                6
                                            </div>
                                        </td>
                                        <td className={styles['d2h-cntx']}>
                                            <div
                                                className={
                                                    styles['d2h-code-line']
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-prefix'
                                                        ]
                                                    }
                                                >
                                                    &nbsp;
                                                </span>
                                                <span
                                                    className={
                                                        styles[
                                                            'd2h-code-line-ctn'
                                                        ]
                                                    }
                                                >
                                                    {' '}
                                                    refactor
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
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
