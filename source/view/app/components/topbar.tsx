/*
 *
 * topBar.tsx
 * Component at the top of the Adamite panel -- includes search bar and sandwich menu
 *
 */
import * as React from 'react'
import { Annotation, Type, Option } from '../../../constants/constants'
import SearchBar from './topbarComponents/searchbar'
import GlobalMenu from './topbarComponents/globalMenu'
import styles from '../styles/topbar.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import SortBy from './topbarComponents/sortBy'
import PersonIcon from '@mui/icons-material/Person'
import OptionChipsBar from './topbarComponents/optionChipsBar'
import { Groups } from '@mui/icons-material'
import { Checkbox, FormControlLabel } from '@mui/material'
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
    const initAuthorOptions: Option[] = [
        { name: 'mine', selected: true, icon: <PersonIcon fontSize="small" /> },
        {
            name: 'others',
            selected: true,
            icon: <Groups fontSize="small" />,
        },
    ]
    const initSort = 'Relevance'
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
                <SortBy
                    sortByOptionSelected={filtersUpdated}
                    selected={initSort}
                ></SortBy>
            </div>
            <div className={styles['RowContainer']}>
                <OptionChipsBar
                    label="Author"
                    initOptions={initAuthorOptions}
                    editOptions={filtersUpdated}
                ></OptionChipsBar>
            </div>
            <div className={styles['RowContainer']}>
                Types:{' '}
                <AnnotationTypesBar
                    currentTypes={Object.values(Type)}
                    editTypes={updateAnnotationTypes}
                />
            </div>
            <div>
                <FormControlLabel control={<Checkbox />} label="In-File Only" />
                <FormControlLabel
                    control={<Checkbox />}
                    label="Show Resolved"
                />
            </div>
        </div>
    )
}

export default TopBar
