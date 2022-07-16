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
interface Props {
    annotations: Annotation[]
    getSearchedAnnotations: (annotations: Annotation[]) => void
    saveAnnotationsToJson: () => void
    showKeyboardShortcuts: () => void
}
// Add a bell/notification
const TopBar: React.FC<Props> = ({
    annotations,
    getSearchedAnnotations,
    saveAnnotationsToJson,
    showKeyboardShortcuts,
}) => {
    const updateAnnotationTypes = (types: Type[]): void => {
        console.log('UPDATE TYPES')
    }
    return (
        <div className={styles['TopBarContainer']}>
            <div className={styles['SearchRowContainer']}>
                <SearchBar
                    annotations={annotations}
                    getSearchedAnnotations={getSearchedAnnotations}
                />
                <GlobalMenu
                    saveAnnotationsToJson={saveAnnotationsToJson}
                    showKeyboardShortcuts={showKeyboardShortcuts}
                />
            </div>
            <AnnotationTypesBar
                currentTypes={Object.values(Type)}
                editTypes={updateAnnotationTypes}
                small={false}
            />
        </div>
    )
}

export default TopBar
