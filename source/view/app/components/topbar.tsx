/*
 *
 * topBar.tsx
 * Component at the top of the Adamite panel -- includes search bar and sandwich menu
 *
 */
import * as React from 'react'
import {
    Annotation,
    Type,
    Option,
    FilterOptions,
    Sort,
    AuthorOptions,
} from '../../../constants/constants'
import SearchBar from './topbarComponents/searchbar'
import GlobalMenu from './topbarComponents/globalMenu'
import styles from '../styles/topbar.module.css'
import AnnotationTypesBar from './annotationComponents/annotationTypesBar'
import SortBy from './topbarComponents/sortBy'
import OptionChipsBar from './topbarComponents/optionChipsBar'
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
import {
    defaultAuthorOptions,
    defaultFilterOptions,
} from '../utils/viewUtilsTsx'
import { defaultSort } from '../utils/viewUtils'
interface Props {
    annotations: Annotation[]
    getSearchedAnnotations: (annotations: Annotation[]) => void
    saveAnnotationsToJson: () => void
    showKeyboardShortcuts: () => void
    filtersUpdated: (filters: FilterOptions) => void
}
// Add a bell/notification
const TopBar: React.FC<Props> = ({
    annotations,
    getSearchedAnnotations,
    saveAnnotationsToJson,
    showKeyboardShortcuts,
    filtersUpdated,
}) => {
    const [filterOptions, setFilterOptions] =
        React.useState<FilterOptions>(defaultFilterOptions)

    const annotationTypesUpdated = (types: Type[]): void => {
        setFilterOptions({ ...filterOptions, typeOptions: types })
        filtersUpdated(filterOptions)
    }

    const optionsUpdated = (newOptions: Option[]) => {
        setFilterOptions({ ...filterOptions, authorOptions: newOptions })
        filtersUpdated(filterOptions)
    }

    const sortUpdated = (selected: Sort) => {
        setFilterOptions({ ...filterOptions, sort: selected })
        filtersUpdated(filterOptions)
    }
    // getSearchedAnnotations
    const searchValueUpdated = (value: string) => {
        console.log('Top Bar Filtered Called')
        setFilterOptions({ ...filterOptions, searchText: value })
        filtersUpdated(filterOptions)
    }

    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
            },
            background: {
                paper: `${vscodeTextColor}`,
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
            // MuiIconButton: {
            //     styleOverrides: {
            //         root: {
            //             backgroundColor: editorBackground,
            //             color: iconColor,
            //         },
            //     },
            // },
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
                        searchValueUpdated={searchValueUpdated}
                    />
                    <GlobalMenu
                        saveAnnotationsToJson={saveAnnotationsToJson}
                        showKeyboardShortcuts={showKeyboardShortcuts}
                    />
                </div>
                <div className={styles['OptionsContainer']}>
                    <SortBy
                        sortByOptionSelected={sortUpdated}
                        initSort={filterOptions.sort}
                    ></SortBy>
                    <OptionChipsBar
                        label="Author"
                        initOptions={filterOptions.authorOptions}
                        editOptions={optionsUpdated}
                    ></OptionChipsBar>
                    <div className={styles['RowContainer']}>
                        <div className={styles['OptionLabel']}>
                            Types:{'  '}
                        </div>
                        <AnnotationTypesBar
                            currentTypes={filterOptions.typeOptions}
                            editTypes={annotationTypesUpdated}
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
