import * as React from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
    editorBackground,
    vscodeTextColor,
    hoverText,
} from '../../styles/vscodeStyles'

import { Scope } from '../../../../constants/constants'

interface Props {
    initScope: Scope
    scopeOptionSelected: (selected: Scope) => void
}

const ScopeMenu: React.FC<Props> = ({ initScope, scopeOptionSelected }) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const [scope, setScope] = React.useState<Scope>(initScope)
    const open = Boolean(anchorEl)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }
    const handleClose = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation()
        setAnchorEl(null)
        // scopeOptionSelected()
    }

    // const scopeOptionSelected = (selected?: Scope = undefined) => {
    //     if (selected) {
    //         setScope(selected)
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
                    id={'scope-button'}
                    aria-controls={open ? 'scope-menu' : undefined}
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
                    Scope: {scope}
                </Button>
                <Menu
                    id={'scope-menu'}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                        'aria-labelledby': 'scope-button',
                        dense: true,
                    }}
                    PaperProps={{
                        style: { borderRadius: 4 },
                    }}
                >
                    {Object.values(Scope).map((scope: Scope, id) => {
                        return (
                            <MenuItem
                                href=""
                                key={id}
                                onClick={(
                                    e: React.MouseEvent<HTMLAnchorElement>
                                ) => {
                                    e.stopPropagation()
                                    handleClose(e)
                                    setScope(scope)
                                    scopeOptionSelected(scope)
                                }}
                            >
                                {scope}
                            </MenuItem>
                        )
                    })}
                </Menu>
            </ThemeProvider>
        </>
    )
}

export default ScopeMenu
