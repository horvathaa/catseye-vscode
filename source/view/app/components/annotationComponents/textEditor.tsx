import * as React from "react";
import styles from '../../styles/annotation.module.css';

interface Props {
    content: any,
    submissionHandler: (newContent: any) => void,
    cancelHandler: () => void
}

const TextEditor: React.FC<Props> = ({ content, submissionHandler, cancelHandler }) => {
    const [text, setText] = React.useState(content);

    const updateAnnotationContent = (e: React.SyntheticEvent) => {
        if(typeof text === 'string') {
            setText((e.target as HTMLTextAreaElement).value);
        }
        else {
            setText({...text, replyContent: (e.target as HTMLTextAreaElement).value })
        }
    }

    return (
        <div className={styles['textboxContainer']}>
            <textarea 
                className={styles['textbox']} 
                value={typeof text === 'string' ? text : text.replyContent} 
                onChange={updateAnnotationContent}
            />
            <button className={styles['submit']} onClick={() => submissionHandler(text)}>Submit</button>
            <button className={styles['cancel']} onClick={() => cancelHandler()}>Cancel</button>
        </div>
    )
}

export default TextEditor;