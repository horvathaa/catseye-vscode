import * as React from "react";
import SplitButton from './muiSplitButton';
import styles from '../../styles/annotation.module.css';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { green } from '@material-ui/core/colors';
interface Props {
    content: any,
    submissionHandler: (newContent: any, shareWith?: string, willBePinned?: boolean) => void,
    cancelHandler: () => void;
    showSplitButton: boolean
}

const TextEditor: React.FC<Props> = ({ content, submissionHandler, cancelHandler, showSplitButton }) => {
    const [text, setText] = React.useState<any>(content);
    const [willBePinned, setWillBePinned] = React.useState<boolean>(false);

    const theme = createTheme({
        // palette: {
        //     primary: {
        //         main: '#1e1e1e' 
        //     }
        // },
        typography: {
            allVariants: {
                fontSize: 12,
                color: 'white',
                fontFamily: 'Arial'
            }
        },
        components: {
            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        color: green[400],
                        '&.Mui-checked': {
                            color: green[600]
                        },
                    },
                }
            },
            MuiButtonBase: {
                styleOverrides: {
                    root: {
                        color: green[400]
                    }
                }
            }
        }
    });


    const updateAnnotationContent = (e: React.SyntheticEvent) => {
        if(typeof text === 'string') {
            setText((e.target as HTMLTextAreaElement).value);
        }
        else if(text.hasOwnProperty('replyContent')) {
            setText({ ...text, replyContent: (e.target as HTMLTextAreaElement).value });
        }
        else if(text.hasOwnProperty('comment')) {
            setText({ ...text, comment: (e.target as HTMLTextAreaElement).value });
        }
    }

    const handleSubmission = (shareWith: string) => {
        if(text.hasOwnProperty('comment')) {
            cancelHandler();
        }
        submissionHandler(text, shareWith, willBePinned);
    }

    return (
        <div className={styles['textboxContainer']}>
            <textarea 
                className={styles['textbox']}
                autoFocus
                value={typeof text === 'string' ? text : text.hasOwnProperty('replyContent') ? text.replyContent : text.hasOwnProperty('comment') ? text.comment : ""} 
                onChange={updateAnnotationContent}
                onClick={(e: React.SyntheticEvent) => e.stopPropagation()}
            />
            <div className={styles['bottomRow']}>
                <div className={styles['bottomRow']}>
                    {showSplitButton ? 
                        <SplitButton
                            submissionHandler={handleSubmission} 
                        /> : 
                        <button className={styles['submit']} onClick={
                            (e: React.SyntheticEvent) => { 
                            e.stopPropagation();
                            if(text.hasOwnProperty('comment')) {
                                cancelHandler();
                            }
                            submissionHandler(text);
                        }}>Submit</button>
                    }
                    
                    <button className={styles['cancel']} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); cancelHandler()}}>Cancel</button>
                </div>
                {showSplitButton && 
                    <ThemeProvider theme={theme}>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox onChange={() => setWillBePinned((willBePinned) => !willBePinned)} />} label="Pin annotation?" />
                        </FormGroup>
                    </ThemeProvider>
                }
            </div>
        </div>
    )
}

export default TextEditor;