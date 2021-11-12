import * as React from "react";
import styles from '../../styles/annotation.module.css';
import { VscChevronUp, VscChevronDown, VscChevronRight } from 'react-icons/vsc';

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
    const isSingleLineAnchor: boolean = (endLine - startLine) === 0;
    // const isWideAnchor: boolean = 
    
    const collapseExpandToggle = () :  React.ReactElement<any> => {
        return collapsed ? <VscChevronDown onClick={() => setCollapsed(!collapsed)} className={styles['IconContainer']} /> : 
        <VscChevronUp onClick={() => setCollapsed(!collapsed)} className={styles['IconContainer']} />
    }


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
                    {!isSingleLineAnchor && collapseExpandToggle()}
                </div>
            </div>
        </div>
    )
}

export default Anchor;