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
    OptionGroup,
    Scope,
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

    const annotationTypesUpdated = (newOptions: OptionGroup): void => {
        console.log('Types Updated')
        const newFilterOptions = { ...filterOptions, typeOptions: newOptions }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const optionsUpdated = (newOptions: OptionGroup) => {
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

    const scopeUpdated = (selected: Scope) => {
        console.log('Sort Updated')
        const newFilterOptions = { ...filterOptions, Scope: selected }
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
            showResolved: !filterOptions.showResolved,
        }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const showAnchoredUpdated = () => {
        console.log('UPDATED')
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
                        initOptions={filterOptions.authorOptions}
                        editOptions={optionsUpdated}
                    ></OptionChipsBar>
                    <OptionChipsBar
                        initOptions={filterOptions.typeOptions}
                        editOptions={annotationTypesUpdated}
                    ></OptionChipsBar>
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
                        <FormControlLabel
                            control={
                                <Checkbox onChange={showAnchoredUpdated} />
                            }
                            label="Unanchored Only"
                        />
                    </FormGroup>
                </div>
            </ThemeProvider>
        </div>
    )
}

export default TopBar
