import * as React from "react";
import styles from '../../styles/annotation.module.css';
import { BiCaretUpSquare, BiCaretDownSquare} from 'react-icons/bi';

interface SynProps {
    html: string;
    anchorPreview: string;
    collapsed: boolean;
}
  
const Syntax: React.FC<SynProps> = ({ html, anchorPreview, collapsed }) => {
    if(collapsed) {
        return ( <code dangerouslySetInnerHTML={{__html: anchorPreview}}></code> );
    }
    else {
        return ( <code dangerouslySetInnerHTML={{__html: html}}></code> );
    }   
}

interface Props {
    html: string;
    anchorPreview: string;
    visiblePath: string;
    startLine: number;
    endLine: number;
    scrollInEditor: () => void;
}

const Anchor: React.FC<Props> = ({ html, anchorPreview, visiblePath, startLine, endLine, scrollInEditor }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div className={styles['AnchorContainer']}>
            <div className={styles['HTMLContainer']} onClick={() => scrollInEditor()}>
                <Syntax html={html} anchorPreview={anchorPreview} collapsed={collapsed} />
            </div>
            <div className={styles['LocationWrapper']}>
                <div className={styles['LocationContainer']} onClick={() => scrollInEditor()}>
                    {visiblePath}: Line {startLine + 1} to Line {endLine + 1}
                </div>
                <div className={styles['AnchorButtonContainer']}>
                    {collapsed ? <BiCaretDownSquare onClick={() => setCollapsed(!collapsed)} className={styles['IconContainer']} /> : 
                                <BiCaretUpSquare onClick={() => setCollapsed(!collapsed)} className={styles['IconContainer']} />
                    }
                </div>
            </div>
        </div>
    )
}

export default Anchor;