/*
 *
 * topBar.tsx
 * Component at the top of the catseye panel -- includes search bar and sandwich menu
 *
 */
import * as React from 'react'
import {
    FilterOptions,
    Sort,
    OptionGroup,
    Scope,
} from '../../../constants/constants'
import SearchBar from './topbarComponents/searchbar'
import GlobalMenu from './topbarComponents/globalMenu'
import styles from '../styles/topbar.module.css'
import SortBy from './topbarComponents/sortBy'
import OptionChipsBar from './topbarComponents/optionChipsBar'
import {
    Checkbox,
    createTheme,
    FormControlLabel,
    FormGroup,
    ThemeProvider,
} from '@mui/material'
import { vscodeTextColor } from '../styles/vscodeStyles'
import {
    defaultFilterOptions,
    renderAuthorOptions,
} from '../utils/viewUtilsTsx'
import ScopeMenu from './topbarComponents/scopeMenu'

interface Props {
    saveAnnotationsToJson: () => void
    // showKeyboardShortcuts: () => void
    filtersUpdated: (filters: FilterOptions) => void
    vscode: any
    githubUsername: string
}
// Add a bell/notification
const TopBar: React.FC<Props> = ({
    saveAnnotationsToJson,
    // showKeyboardShortcuts,
    filtersUpdated,
    vscode,
    githubUsername,
}) => {
    const [filterOptions, setFilterOptions] =
        React.useState<FilterOptions>(defaultFilterOptions)

    React.useEffect(() => {
        if (githubUsername) {
            setFilterOptions({
                ...filterOptions,
                authorOptions: renderAuthorOptions(githubUsername),
            })
        }
    }, [githubUsername])

    const annotationTypesUpdated = (newOptions: OptionGroup): void => {
        const newFilterOptions = { ...filterOptions, typeOptions: newOptions }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const optionsUpdated = (newOptions: OptionGroup) => {
        const newFilterOptions = { ...filterOptions, authorOptions: newOptions }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const sortUpdated = (selected: Sort) => {
        const newFilterOptions = { ...filterOptions, sort: selected }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
    }

    const scopeUpdated = (selected: Scope) => {
        const newFilterOptions = { ...filterOptions, scope: selected }
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
    const showResolvedUpdated = () => {
        const newFilterOptions = {
            ...filterOptions,
            showResolved: !filterOptions.showResolved,
        }
        setFilterOptions(newFilterOptions)
        filtersUpdated(newFilterOptions)
        vscode.postMessage({
            command: 'showResolvedUpdated',
            showResolved: !filterOptions.showResolved,
        })
    }

    const pinnedOnlyUpdated = () => {
        const newFilterOptions = {
            ...filterOptions,
            pinnedOnly: !filterOptions.pinnedOnly,
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
            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        color: `${vscodeTextColor} !important`,
                        '&.Mui-checked': {
                            color: `${vscodeTextColor}`,
                        },
                    },
                },
            },
        },
    })

    return (
        <div className={styles['TopBarContainer']}>
            <ThemeProvider theme={theme}>
                <div className={styles['RowContainer']}>
                    <SearchBar searchValueUpdated={searchValueUpdated} />
                    <GlobalMenu
                        saveAnnotationsToJson={saveAnnotationsToJson}
                        // showKeyboardShortcuts={showKeyboardShortcuts}
                        vscode={vscode}
                    />
                </div>
                <div className={styles['OptionsContainer']}>
                    <SortBy
                        sortByOptionSelected={sortUpdated}
                        initSort={filterOptions.sort}
                    ></SortBy>
                    <ScopeMenu
                        scopeOptionSelected={scopeUpdated}
                        initScope={filterOptions.scope}
                    ></ScopeMenu>
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
                            control={
                                <Checkbox onChange={showResolvedUpdated} />
                            }
                            label="Show Resolved"
                        />
                        <FormControlLabel
                            control={<Checkbox onChange={pinnedOnlyUpdated} />}
                            label="Pinned Only"
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
