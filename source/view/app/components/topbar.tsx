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
        console.log('Types Updated')
        const newFilterOptions = { ...filterOptions, typeOptions: types }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const optionsUpdated = (newOptions: Option[]) => {
        console.log('Option Updated')
        const newFilterOptions = { ...filterOptions, authorOptions: newOptions }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const sortUpdated = (selected: Sort) => {
        console.log('Sort Updated')
        const newFilterOptions = { ...filterOptions, sort: selected }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }
    // getSearchedAnnotations
    const searchValueUpdated = (value: string) => {
        // This avoids duplication, once we set filterOptions,
        // we are still capturing the old one so can't just use filterOptions
        const newFilterOptions = { ...filterOptions, searchText: value }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const showInFileUpdated = () => {
        const newFilterOptions = {
            ...filterOptions,
            showFileOnly: !filterOptions.showFileOnly,
        }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const showResolvedUpdated = () => {
        const newFilterOptions = {
            ...filterOptions,
            showResolved: !filterOptions.showFileOnly,
        }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const theme = createTheme({
        palette: {
            primary: {
                main: `${vscodeTextColor}`,
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
                            control={<Checkbox onChange={showInFileUpdated} />}
                            label="In-File Only"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox onChange={showResolvedUpdated} />
                            }
                            label="Show Resolved"
                        />
                    </FormGroup>
                </div>
            </ThemeProvider>
        </div>
    )
}

export default TopBar
