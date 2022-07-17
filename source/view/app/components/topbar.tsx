/*
 *
 * topBar.tsx
 * Component at the top of the Adamite panel -- includes search bar and sandwich menu
 *
 */
import * as React from 'react'
import { Annotation, Type } from '../../../constants/constants'
import SearchBar from './topbarComponents/searchbar'
import GlobalMenu from './topbarComponents/globalMenu'
import styles from '../styles/topbar.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import SortBy from './topbarComponents/sortBy'
interface Props {
    annotations: Annotation[]
    getSearchedAnnotations: (annotations: Annotation[]) => void
    saveAnnotationsToJson: () => void
    showKeyboardShortcuts: () => void
    // filtersUpdated: (filters: SearchFilters) => void
    filtersUpdated: () => void
}
// Add a bell/notification
const TopBar: React.FC<Props> = ({
    annotations,
    getSearchedAnnotations,
    saveAnnotationsToJson,
    showKeyboardShortcuts,
    filtersUpdated,
}) => {
    const updateAnnotationTypes = (types: Type[]): void => {
        console.log('UPDATE TYPES')
    }
    return (
        <div className={styles['TopBarContainer']}>
            <div className={styles['RowContainer']}>
                <SearchBar
                    annotations={annotations}
                    getSearchedAnnotations={getSearchedAnnotations}
                />
                <GlobalMenu
                    saveAnnotationsToJson={saveAnnotationsToJson}
                    showKeyboardShortcuts={showKeyboardShortcuts}
                />
            </div>
            <div className={styles['RowContainer']}>
                <SortBy sortByOptionSelected={filtersUpdated}></SortBy>
            </div>
            <div>
                Types:{' '}
                <AnnotationTypesBar
                    currentTypes={Object.values(Type)}
                    editTypes={updateAnnotationTypes}
                />
            </div>
        </div>
    )
}

export default TopBar
