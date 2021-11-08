import * as React from "react";
import styles from '../../styles/annotation.module.css';

interface Props {
    annoContent: string,
    submissionHandler: (newAnnoContent: string) => void,
    cancelHandler: () => void
}

const TextEditor: React.FC<Props> = ({ annoContent, submissionHandler, cancelHandler }) => {
    const [text, setText] = React.useState(annoContent);

    const updateAnnotationContent = (e: React.SyntheticEvent) => {
        setText((e.target as HTMLTextAreaElement).value);
    }

    return (
        <div className={styles['textboxContainer']}>
            <textarea 
                className={styles['textbox']} 
                value={text} 
                onChange={updateAnnotationContent}
            />
            <button className={styles['submit']} onClick={() => submissionHandler(text)}>Submit</button>
            <button className={styles['cancel']} onClick={() => cancelHandler()}>Cancel</button>
        </div>
    )
}

export default TextEditor;