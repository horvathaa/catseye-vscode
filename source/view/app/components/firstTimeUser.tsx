import * as React from 'react'
import { cardStyle } from '../styles/vscodeStyles'
import styles from '../styles/firstTimeUser.module.css'
import loginStyles from '../styles/login.module.css'

interface Props {
    setShowFirstTimeUserContent: (val: boolean) => void
}

const FirstTimeUser: React.FC<Props> = ({ setShowFirstTimeUserContent }) => {
    return (
        <div
            style={{
                ...cardStyle,
                margin: '2rem',
                padding: '2rem',
                paddingBottom: '2rem',
            }}
            className={`${styles['m-4']}`}
        >
            <h1 className={`${styles['text-center']}`}>Welcome to Catseye!</h1>
            <h2>Here are some of the basics...</h2>
            Note that you will <b>not</b> need to go through the GitHub or
            Adamite authentication processes after this point -- Catseye will
            automatically log-in whenever VS Code launches.
            <ul className={`${styles['list-none']} ${styles['pl-0']}`}>
                <li>
                    <h3>Creating an Annotation</h3>
                    <div>
                        <ul>
                            <li>
                                First, <b>select some code</b>.
                            </li>
                            <li>
                                Then, either{' '}
                                <b>
                                    use the context menu or the keyboard
                                    shortcut (by default, Ctrl + Alt + A on
                                    Windows and Cmd + Opt + A on Mac)
                                </b>{' '}
                                to start creating an annotation.
                            </li>
                            <li>
                                The Catseye pane will update with a preview of
                                your new annotation.
                                <img
                                    className={`${styles['border-1']} ${styles['my-2']}`}
                                    style={{ borderColor: cardStyle.color }}
                                    src="https://www.catseye.tech/catseye-new-annotation.png"
                                />
                                Here, you can{' '}
                                <b>add your annotation and click "Post"</b> when
                                you are done.
                            </li>
                            <li className={`${styles['ml-2']}`}>
                                You can also add additional code snippets (or
                                code "anchors") to the annotation by selecting
                                more code and clicking the anchor button. You
                                can also label your code with different tags,
                                such as "issue" or "task", to help with managing
                                your different activities. You can also choose
                                whether you want the annotation to be viewable
                                by other people that are part of the GitHub
                                repository this code is part of, or private to
                                just you.
                            </li>
                            <li>
                                The{' '}
                                <b>
                                    Catseye pane should update with your new
                                    annotation
                                </b>{' '}
                                -- it will initially appear collapsed and{' '}
                                <b>clicking on the annotation will expand it</b>
                                , with the expanded version shown in the
                                screenshot. In the code editor, your annotated
                                code will have a light gray highlight and
                                hovering over the highlight will show your
                                annotation text.
                            </li>
                        </ul>
                    </div>
                </li>
            </ul>
            <div
                className={`${styles['flex']} ${styles['flex-col']} ${loginStyles.InputFieldContainer} ${loginStyles.row}`}
            >
                <h4>Ready to start annotating?</h4>
                <button onClick={() => setShowFirstTimeUserContent(false)}>
                    Click Here to Begin!
                </button>
            </div>
        </div>
    )
}

export default FirstTimeUser
