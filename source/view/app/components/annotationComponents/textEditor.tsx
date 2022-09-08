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
import { textBoxBackground, vscodeTextColor } from '../../styles/vscodeStyles'
import { TextareaAutosize } from '@material-ui/core'

interface Selection {
    startOffset: number
    endOffset: number
}

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
    onChange?: (
        newTextAreaValue: string,
        userText: string,
        selectedRange: Selection
    ) => void
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
    onChange,
}) => {
    const [text, setText] = React.useState<any>(content)
    const [willBePinned, setWillBePinned] = React.useState<boolean>(false)
    const [hasSelectedRange, setHasSelectedRange] =
        React.useState<boolean>(false)
    const [selectedRange, _setSelectedRange] = React.useState<Selection | null>(
        null
    )
    const selectedRangeRef = React.useRef(selectedRange)
    const setSelectedRange = (newSelectedRange: Selection | null): void => {
        selectedRangeRef.current = newSelectedRange
        _setSelectedRange(newSelectedRange)
    }

    const [clipboardText, _setClipboardText] = React.useState<string>('')

    React.useEffect(() => {
        setText(content)
    }, [content])

    React.useEffect(() => {
        window.document.addEventListener('keydown', setClipboardText)
        return () => {
            window.document.removeEventListener('keydown', setClipboardText)
        }
    }, [])

    const setClipboardText = (e: Event): void => {
        const keyboardEvent = e as KeyboardEvent
        if (
            window &&
            (keyboardEvent.code === 'KeyC' || keyboardEvent.code === 'KeyX') &&
            keyboardEvent.ctrlKey
        ) {
            const copiedText: string | undefined = window
                .getSelection()
                ?.toString()
            if (copiedText) _setClipboardText(copiedText)
        }
    }
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
        },
    })

    const updateAnnotationContent = (e: React.SyntheticEvent) => {
        const textArea = e.target as HTMLTextAreaElement
        const newText = textArea.value
        if (typeof text === 'string' && onChange) {
            const nativeEvent = e.nativeEvent as InputEvent
            if (nativeEvent.inputType.includes('deleteContent')) {
                return
            }
            // worlds worst ternary
            const userText =
                nativeEvent.inputType == 'insertFromPaste' && clipboardText
                    ? clipboardText
                    : nativeEvent.inputType.includes('deleteContent')
                    ? ''
                    : (e.nativeEvent as InputEvent).data !== null
                    ? (e.nativeEvent as InputEvent).data
                    : ''

            const selection: Selection = {
                startOffset:
                    nativeEvent.inputType.includes('deleteContent') &&
                    selectedRangeRef !== null &&
                    selectedRangeRef.current
                        ? selectedRangeRef.current.startOffset
                        : userText
                        ? textArea.selectionStart - userText.length
                        : textArea.selectionStart, // REALLY stupid im so mad holy shit
                endOffset:
                    nativeEvent.inputType.includes('deleteContent') &&
                    selectedRangeRef !== null &&
                    selectedRangeRef.current
                        ? selectedRangeRef.current.endOffset
                        : textArea.selectionEnd, // slightly less stupid
            }

            setText(newText)
            if (userText) {
                // const textAdded = (e.nativeEvent as InputEvent).data
                onChange(newText, userText, selection)
            }
        } else if (typeof text === 'string') {
            setText(newText)
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
        } else if (hasSelectedRange && onChange) {
            const key = e.key
            const textArea = e.target as HTMLTextAreaElement
            if (key !== 'Backspace' && !(e.metaKey || e.ctrlKey || e.altKey)) {
                // probably input event
                // could add redundancy check to see if the value of the input changed as well uhguig

                if (
                    selectedRange &&
                    textArea.selectionStart === selectedRange.startOffset + 1
                ) {
                    // replaced range with char
                    onChange(textArea.value, key, selectedRange)
                }
            } else if (key === 'Backspace' && selectedRange) {
                onChange(textArea.value, '', selectedRange)
            }
            setHasSelectedRange(false)
            setSelectedRange(null)
        }
    }

    const handleMouseUp = (e: React.MouseEvent): void => {
        const target = e.target as HTMLTextAreaElement

        if (target.selectionStart !== target.selectionEnd) {
            setHasSelectedRange(true)
            setSelectedRange({
                startOffset: target.selectionStart,
                endOffset: target.selectionEnd,
            })
        } else if (hasSelectedRange) {
            setHasSelectedRange(false)
            setSelectedRange(null)
        }
    }

    const handleSubmission = (shareWith: string) => {
        console.log('how does this work again lol', shareWith)
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
                onMouseUp={handleMouseUp}
            />
            <div className={styles['bottomRow']}>
                <div className={styles['bottomRow']}>
                    {showSplitButton ? (
                        <SplitButton submissionHandler={handleSubmission} />
                    ) : (
                        <>
                            {!showCancel && text.replyContent.length ? (
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
                                            createdTimestamp:
                                                new Date().getTime(),
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
                            ) : null}
                        </>
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
