import * as React from "react";
import styles from '../../styles/annotation.module.css';
import { VscChevronUp, VscChevronDown } from 'react-icons/vsc';

interface SynProps {
    html: string;
    anchorPreview?: string;
    collapsed?: boolean;
}
  
export const Syntax: React.FC<SynProps> = ({ html, anchorPreview, collapsed }) => {
    if(collapsed && anchorPreview) {
        return ( <code dangerouslySetInnerHTML={{__html: anchorPreview}}></code> );
    }
    else if(anchorPreview) {
        return ( <code dangerouslySetInnerHTML={{__html: html}}></code> );
    }
    else {
        return ( <code dangerouslySetInnerHTML={{__html: html}} style={{ cursor: 'normal' }}></code> );
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
    const [collapsed, setCollapsed] = React.useState<boolean>(false);
    const isSingleLineAnchor: boolean = (endLine - startLine) === 0;
    
    const collapseExpandToggle = () :  React.ReactElement<any> => {
        return collapsed ? <VscChevronDown onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setCollapsed(!collapsed) }} className={styles['IconContainer']} /> : 
        <VscChevronUp onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setCollapsed(!collapsed) }} className={styles['IconContainer']} />
    }


    return (
        <div className={styles['AnchorContainer']}>
            <div className={styles['HTMLContainer']} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); scrollInEditor(); }}>
                <Syntax html={html} anchorPreview={anchorPreview} collapsed={collapsed} />
            </div>
            <div className={styles['LocationWrapper']}>
                <div className={styles['LocationContainer']} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); scrollInEditor(); }}>
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