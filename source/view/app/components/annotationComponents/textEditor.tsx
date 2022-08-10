/*
 *
 * textEditor.tsx
 * Basic text editor component used for creating and editing annotation contents, along with replies and snapshots.
 * Split button is used for annotation creation support, while regular "submit" button is used for replies and snapshots.
 */
import * as React from 'react'
import SplitButton from './muiSplitButton'
import styles from '../../styles/annotation.module.css'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { green } from '@material-ui/core/colors'
import {
    editorBackground,
    textBoxBackground,
    vscodeTextColor,
} from '../../styles/vscodeStyles'
import { TextareaAutosize } from '@material-ui/core'

interface Props {
    content: any // Is either a reply, text, or annotation
    submissionHandler: (
        newContent: any,
        shareWith?: string,
        willBePinned?: boolean
    ) => void
    cancelHandler: () => void
    showSplitButton: boolean
    showCancel?: boolean
    focus?: boolean
    placeholder?: string
}
// Having default props is weirdly supported in React, this way means showCancel is an optional
// See: https://dev.to/bytebodger/default-props-in-react-typescript-2o5o
const TextEditor: React.FC<Props> = ({
    content,
    submissionHandler,
    cancelHandler,
    showSplitButton,
    showCancel = true,
    focus = true,
    placeholder = '',
}) => {
    const [text, setText] = React.useState<any>(content)
    const [willBePinned, setWillBePinned] = React.useState<boolean>(false)
    // TODO: Change this theme
    const theme = createTheme({
        palette: {
            primary: {
                main: `${vscodeTextColor}`,
            },
            background: {
                paper: `${vscodeTextColor}`,
            },
        },
        typography: {
            allVariants: {
                fontSize: 12,
                color: `${vscodeTextColor}`,
                fontFamily: 'Arial',
            },
        },
        components: {
            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        color: `${vscodeTextColor} !important`,
                        '&.Mui-checked': {
                            color: `${vscodeTextColor}`,
                        },
                    },
                },
            },
            // MuiButtonBase: {
            //     styleOverrides: {
            //         root: {
            //             color: green[400],
            //         },
            //     },
            // },
            // MuiButton: {
            //     styleOverrides: {
            //         root: {
            //             color: green[400],
            //         },
            //     },
            // },
        },
    })

    const updateAnnotationContent = (e: React.SyntheticEvent) => {
        if (typeof text === 'string') {
            setText((e.target as HTMLTextAreaElement).value)
        } else if (text.hasOwnProperty('replyContent')) {
            // Checks if is reply
            setText({
                ...text,
                replyContent: (e.target as HTMLTextAreaElement).value,
            })
        } else if (text.hasOwnProperty('comment')) {
            // Checks if comment
            setText({
                ...text,
                comment: (e.target as HTMLTextAreaElement).value,
            })
        }
    }

    const handleEnter = (e: React.KeyboardEvent): void => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            submissionHandler(text, 'private', willBePinned)
            setText({
                ...text,
                replyContent: '',
            })
        }
    }

    const handleSubmission = (shareWith: string) => {
        if (text.hasOwnProperty('comment')) {
            cancelHandler()
        }
        submissionHandler(text, shareWith, willBePinned)
    }
    // Ideally this textbox isn't a significantly different color and is not of fixed size.
    return (
        <div className={styles['textboxContainer']}>
            <TextareaAutosize
                minRows={1}
                className={styles['textbox']}
                style={{ backgroundColor: textBoxBackground }}
                autoFocus={focus}
                placeholder={placeholder}
                value={
                    typeof text === 'string'
                        ? text
                        : text.hasOwnProperty('replyContent')
                        ? text.replyContent
                        : text.hasOwnProperty('comment')
                        ? text.comment
                        : ''
                }
                onChange={updateAnnotationContent}
                onKeyDown={handleEnter}
                onClick={(e: React.SyntheticEvent) => e.stopPropagation()}
            />
            <div className={styles['bottomRow']}>
                <div className={styles['bottomRow']}>
                    {showSplitButton ? (
                        <SplitButton submissionHandler={handleSubmission} />
                    ) : (
                        <button
                            className={styles['submit']}
                            onClick={(e: React.SyntheticEvent) => {
                                e.stopPropagation()
                                // Is this a checker for Snapshots?
                                if (text.hasOwnProperty('comment')) {
                                    cancelHandler()
                                }

                                // TODO: Update timestamp
                                setText({
                                    ...text,
                                    createdTimestamp: new Date().getTime(),
                                })
                                submissionHandler(text)
                                setText({
                                    ...text,
                                    replyContent: '',
                                })
                            }}
                        >
                            Submit
                        </button>
                    )}

                    {showCancel && (
                        <button
                            className={styles['cancel']}
                            onClick={(e: React.SyntheticEvent) => {
                                e.stopPropagation()
                                cancelHandler()
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
                {showSplitButton && (
                    <ThemeProvider theme={theme}>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        style={{
                                            fontSize: 14,
                                            color: `${vscodeTextColor} !important`,
                                        }}
                                        onChange={() =>
                                            setWillBePinned(
                                                (willBePinned) => !willBePinned
                                            )
                                        }
                                    />
                                }
                                label="Pin annotation?"
                            />
                        </FormGroup>
                    </ThemeProvider>
                )}
            </div>
        </div>
    )
}

export default TextEditor
