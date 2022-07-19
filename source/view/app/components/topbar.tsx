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
import { defaultAuthorOptions } from '../utils/viewUtilsTsx'
import { defaultSort } from '../utils/viewUtils'
import { red } from '@material-ui/core/colors'
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
    const initAuthorOptions: Option[] = defaultAuthorOptions

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
                        initSort={defaultSort}
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
