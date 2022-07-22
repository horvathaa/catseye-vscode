import * as React from 'react'
import { styled, alpha } from '@mui/material/styles'
import Button from '@mui/material/Button'
import Menu, { MenuProps } from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import EditIcon from '@mui/icons-material/Edit'
import Divider from '@mui/material/Divider'
import ArchiveIcon from '@mui/icons-material/Archive'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
    editorBackground,
    vscodeTextColor,
    hoverBackground,
    hoverText,
} from '../../styles/vscodeStyles'
import { yellow } from '@mui/material/colors'
import { EnumType } from 'typescript'
import { Sort } from '../../../../constants/constants'

interface Props {
    initSort: Sort
    sortByOptionSelected: (selected: Sort) => void
}

const SortBy: React.FC<Props> = ({ initSort, sortByOptionSelected }) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const [sort, setSort] = React.useState<Sort>(initSort)
    const open = Boolean(anchorEl)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }
    const handleClose = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation()
        setAnchorEl(null)
        // sortByOptionSelected()
    }

    // const sortByOptionSelected = (selected?: Sort = undefined) => {
    //     if (selected) {
    //         setSort(selected)
    //     }
    // }
    // https://mui.com/material-ui/customization/theming/
    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
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
            MuiButton: {
                styleOverrides: {
                    root: {
                        // backgroundColor: editorBackground, // Doesn't seem to do anything
                        '&:hover': {
                            // borderColor: vscodeTextColor,
                            margin: '2px 0 !important',
                        },
                    },
                },
            },
            // MuiMenuItem doesn't seem to do anything
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        // backgroundColor: hoverText, // Doesn't seem to do anything
                        '&:hover': {
                            // background: vscodeTextColor,
                        },
                    },
                },
            },
            MuiList: {
                styleOverrides: {
                    root: {
                        backgroundColor: hoverText, // background of item on hover
                        color: editorBackground,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '4px',
                        padding: '0 10px', // Ideally this should go in MenuItem but doesn't seem to work?
                    },
                },
            },
        },
    })

    return (
        <>
            <ThemeProvider theme={theme}>
                <Button
                    id={'sortby-button'}
                    aria-controls={open ? 'sortby-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    variant="outlined"
                    disableElevation
                    onClick={handleClick}
                    style={{
                        padding: '0 10px',
                        color: `${editorBackground}`,
                        backgroundColor: `${hoverText}`,
                        textTransform: 'none',
                        borderRadius: '4px',
                        margin: '3px 1px',
                    }}
                    endIcon={<KeyboardArrowDownIcon />}
                >
                    Sort: {sort}
                </Button>
                <Menu
                    id={'sortby-menu'}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                        'aria-labelledby': 'sortby-button',
                        dense: true,
                    }}
                    PaperProps={{
                        style: { borderRadius: 4 },
                    }}
                >
                    {Object.values(Sort).map((sort: Sort, id) => {
                        return (
                            <MenuItem
                                href=""
                                key={id}
                                onClick={(
                                    e: React.MouseEvent<HTMLAnchorElement>
                                ) => {
                                    e.stopPropagation()
                                    handleClose(e)
                                    setSort(sort)
                                    sortByOptionSelected(sort)
                                }}
                            >
                                {sort}
                            </MenuItem>
                        )
                    })}
                    {/* <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            setSort(selected)
                            sortByOptionSelected(selected)
                        }}
                    >
                        Relevance
                    </MenuItem>
                    <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            setSort(selected)
                            sortByOptionSelected(selected)
                        }}
                    >
                        Location
                    </MenuItem>
                    <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            sortByOptionSelected(selected)
                        }}
                    >
                        Time
                    </MenuItem> */}
                </Menu>
            </ThemeProvider>
        </>
    )
}

export default SortBy
