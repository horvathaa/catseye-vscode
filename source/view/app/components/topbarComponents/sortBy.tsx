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
} from '../../styles/vscodeStyles'

interface Props {
    sortByOptionSelected: () => void
}

const SortBy: React.FC<Props> = ({ sortByOptionSelected }) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }
    const handleClose = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation()
        setAnchorEl(null)
        sortByOptionSelected()
    }

    // https://mui.com/material-ui/customization/theming/
    const theme = createTheme({
        palette: {
            primary: {
                main: `${editorBackground}`,
            },
        },
        typography: {
            allVariants: {
                fontSize: 12,
                color: `${vscodeTextColor}`,
                fontFamily: 'Arial',
            },
        },
        components: {
            MuiMenu: {
                styleOverrides: {
                    root: {
                        borderStyle: 'solid',
                        borderWidth: '0.15em',
                        borderColor: '#d4d4d44f',
                    },
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        backgroundColor: editorBackground,
                        '&:hover': {
                            background: hoverBackground,
                        },
                    },
                },
            },
            MuiList: {
                styleOverrides: {
                    root: {
                        backgroundColor: vscodeTextColor,
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
                    variant="contained"
                    disableElevation
                    onClick={handleClick}
                >
                    Sort:
                </Button>
                <Menu
                    id={'sortby-menu'}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                        'aria-labelledby': 'sortby-button',
                    }}
                >
                    <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            sortByOptionSelected()
                        }}
                    >
                        Relevance
                    </MenuItem>
                    <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            sortByOptionSelected()
                        }}
                    >
                        Location
                    </MenuItem>
                    <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            sortByOptionSelected()
                        }}
                    >
                        Time
                    </MenuItem>
                </Menu>
            </ThemeProvider>
        </>
    )
}

export default SortBy
