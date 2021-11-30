import * as React from "react";
import SplitButton from './muiSplitButton';
import styles from '../../styles/annotation.module.css';


interface Props {
    content: any,
    submissionHandler: (newContent: any, shareWith?: string) => void,
    cancelHandler: () => void;
    showSplitButton: boolean
}

const TextEditor: React.FC<Props> = ({ content, submissionHandler, cancelHandler, showSplitButton }) => {
    const [text, setText] = React.useState<any>(content);

    const updateAnnotationContent = (e: React.SyntheticEvent) => {
        if(typeof text === 'string') {
            setText((e.target as HTMLTextAreaElement).value);
        }
        else {
            setText({ ...text, replyContent: (e.target as HTMLTextAreaElement).value });
        }
    }

    const handleSubmission = (shareWith: string) => {
        submissionHandler(text, shareWith);
    }

    return (
        <div className={styles['textboxContainer']}>
            <textarea 
                className={styles['textbox']} 
                value={typeof text === 'string' ? text : text.replyContent} 
                onChange={updateAnnotationContent}
                onClick={(e: React.SyntheticEvent) => e.stopPropagation()}
            />
            {showSplitButton ? 
                <SplitButton
                    submissionHandler={handleSubmission} 
                /> : 
                <button className={styles['submit']} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); submissionHandler(text) }}>Submit</button>
            }
            
            <button className={styles['cancel']} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); cancelHandler()}}>Cancel</button>
        </div>
    )
}

export default TextEditor;