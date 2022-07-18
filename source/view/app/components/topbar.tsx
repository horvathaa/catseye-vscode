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
import {
    Checkbox,
    createTheme,
    FormControlLabel,
    FormGroup,
    ThemeProvider,
} from '@mui/material'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
} from '../styles/vscodeStyles'
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

    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
            },
            background: {
                paper: `${editorBackground}`,
            },
        },
        typography: {
            allVariants: {
                fontSize: 14,
                color: `${vscodeTextColor}`,
                fontFamily: 'Arial',
            },
        },
        components: {
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        backgroundColor: editorBackground,
                        color: iconColor,
                    },
                },
            },
            MuiFormControlLabel: {
                styleOverrides: {
                    root: {
                        margin: '6px',
                    },
                },
            },
            MuiFormGroup: {
                styleOverrides: {
                    root: {
                        flexDirection: 'row',
                    },
                },
            },
        },
    })
    return (
        <div className={styles['TopBarContainer']}>
            <ThemeProvider theme={theme}>
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
                <div className={styles['OptionsContainer']}>
                    <SortBy
                        sortByOptionSelected={filtersUpdated}
                        selected={initSort}
                    ></SortBy>
                    <OptionChipsBar
                        label="Author"
                        initOptions={initAuthorOptions}
                        editOptions={filtersUpdated}
                    ></OptionChipsBar>
                    <div className={styles['RowContainer']}>
                        <div className={styles['OptionLabel']}>
                            Types:{'  '}
                        </div>
                        <AnnotationTypesBar
                            currentTypes={Object.values(Type)}
                            editTypes={updateAnnotationTypes}
                        />
                    </div>
                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox />}
                            label="In-File Only"
                        />
                        <FormControlLabel
                            control={<Checkbox />}
                            label="Show Resolved"
                        />
                    </FormGroup>
                </div>
            </ThemeProvider>
        </div>
    )
}

export default TopBar
