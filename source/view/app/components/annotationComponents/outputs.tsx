import * as React from 'react';
import { Syntax } from './anchor';
import { formatTimestamp } from '../../utils/viewUtils';
import styles from '../../styles/annotation.module.css';
import { collapseExpandToggle } from '../../utils/viewUtilsTsx';

interface OutputProps {
    timestamp: number;
    message: string;
    codeAtTime: string;
}

const Output : React.FC<OutputProps> = ({ timestamp, message, codeAtTime }) => {
    return (
        <div className={styles['OutputContainer']}>
            <div className={`${styles['HTMLContainer']} ${styles['OutputHTMLContainer']}`}>
                <Syntax html={codeAtTime} />
            </div>
            <div className={styles['usernameAndTimeContainer']}>
                {formatTimestamp(timestamp)}
            </div>
            <div className={styles['Output']}>
                {message}
            </div>
        </div>
    )
}

interface Props {
    outputs: {[key: string]: any}[];
    id: string;
}

const Outputs : React.FC<Props> = ({ outputs, id }) => {
    const [showingOutputs, setShowingOutputs] = React.useState<boolean>(false);
    const hasOutputs = outputs && outputs.length;

    return (
        <div className={styles['OutputsContainer']} >
            {hasOutputs ? collapseExpandToggle(showingOutputs, outputs, setShowingOutputs, 'output') : (null)}
            {showingOutputs && hasOutputs ? outputs?.map((output: {[key: string] : any}, index: number) => {
                return <Output key={`output-${id}-${index}`} timestamp={output.timestamp} message={output.message} codeAtTime={output.codeAtTime} />
            }) : (null)}
        </div>
    )
}

export default Outputs;