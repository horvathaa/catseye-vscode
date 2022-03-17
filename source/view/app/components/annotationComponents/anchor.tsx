import * as React from "react";
import cn from 'classnames';
import styles from '../../styles/annotation.module.css';
import { VscChevronUp, VscChevronDown, VscChevronLeft, VscChevronRight, VscDeviceCamera } from 'react-icons/vsc';
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
    anchorId: string;
    anchorPreview: string;
    visiblePath: string;
    startLine: number;
    endLine: number;
    scrollInEditor: (id: string) => void;
    snapshotCode: (id: string) => void;
    originalCode: string;
}

const Anchor: React.FC<Props> = ({ html, anchorId, anchorPreview, visiblePath, startLine, endLine, scrollInEditor, snapshotCode, originalCode }) => {
    const [collapsed, setCollapsed] = React.useState<boolean>(false);
    const [showingOriginalCode, setShowingOriginalCode] = React.useState<boolean>(false);
    const isSingleLineAnchor: boolean = (endLine - startLine) === 0;
    
    const collapseExpandToggle = () :  React.ReactElement<any> => {
        return collapsed ? <VscChevronDown onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setCollapsed(!collapsed) }} className={styles['IconContainer']} /> : 
        <VscChevronUp onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setCollapsed(!collapsed) }} className={styles['IconContainer']} />
    }

    const collapseExpandOriginalCode = () : React.ReactElement<any> => {
        return showingOriginalCode ? 
        (
            <div className={styles['arrowBox']}>
                <VscChevronLeft onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setShowingOriginalCode(!showingOriginalCode) }} className={styles['IconContainer']} /> 
            </div>
        ) : 
        ( 
            <div className={styles['arrowBox']}>
                <VscChevronRight onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); setShowingOriginalCode(!showingOriginalCode) }} className={styles['IconContainer']} /> 
            </div>
        )
    }

    const handleShowInEditor = (e: React.SyntheticEvent) : void => {
        e.stopPropagation(); 
        if(!showingOriginalCode) scrollInEditor(anchorId);
    }



    return (
        <div className={styles['AnchorContainer']}>
            <div className={styles['DropdownItemOverwrite']}>
                <div className={styles['DropdownIconsWrapper']} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); snapshotCode(anchorId); }}>
                    <VscDeviceCamera className={styles['profileMenu']} />
                </div>
                <div className={styles['LocationWrapper']}>
                    <div className={cn({ [styles['LocationContainer']]: true, [styles['multiLine']]: !isSingleLineAnchor })} onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); scrollInEditor(anchorId); }}>
                        {visiblePath}: Line {startLine + 1} to Line {endLine + 1}
                    </div>
                    <div className={styles['AnchorButtonContainer']}>
                        {!isSingleLineAnchor && collapseExpandToggle()}
                    </div>
                </div>
            </div>
            <div className={styles['HTMLContainer']} onClick={handleShowInEditor}>
                {showingOriginalCode ? (
                    <React.Fragment>
                        <Syntax html={originalCode} /> 
                        {collapseExpandOriginalCode()} 
                    </React.Fragment>
                    
                ) : (
                    <React.Fragment>
                        <Syntax html={html} anchorPreview={anchorPreview} collapsed={collapsed} /> 
                        {collapseExpandOriginalCode()} 
                    </React.Fragment>
                )
                
            }
            </div>
            
        </div>
    )
}

export default Anchor;