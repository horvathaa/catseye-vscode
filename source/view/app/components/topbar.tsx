/*
 * 
 * topBar.tsx
 * Component at the top of the Adamite panel -- includes search bar and sandwich menu
 *
 */
import * as React from 'react';
import { Annotation } from '../../../constants/constants';
import SearchBar from './topbarComponents/searchbar';
import GlobalMenu from './topbarComponents/globalMenu';
import styles from '../styles/topbar.module.css';
interface Props {
    annotations: Annotation[],
    getSearchedAnnotations: (annotations: Annotation[]) => void;
    saveAnnotationsToJson: () => void;
    showKeyboardShortcuts: () => void;
}

const TopBar: React.FC<Props> = ({ annotations, getSearchedAnnotations, saveAnnotationsToJson, showKeyboardShortcuts }) => {
    
    return (
        <div className={styles['TopRowContainer']}>
            <SearchBar annotations={annotations} getSearchedAnnotations={getSearchedAnnotations}/>
            <GlobalMenu saveAnnotationsToJson={saveAnnotationsToJson} showKeyboardShortcuts={showKeyboardShortcuts} />
        </div>
    )
}

export default TopBar;