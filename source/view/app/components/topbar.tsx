import * as React from 'react';
import { Annotation } from '../../../constants/constants';
import SearchBar from './topbarComponents/searchbar';
interface Props {
    annotations: Annotation[],
    getSearchedAnnotations: (annotations: Annotation[]) => void;
}

const TopBar: React.FC<Props> = ({ annotations, getSearchedAnnotations }) => {
    
    return (
        <>
            <SearchBar annotations={annotations} getSearchedAnnotations={getSearchedAnnotations}/>
        </>
    )
}

export default TopBar;