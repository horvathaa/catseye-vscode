/*
 *
 * globalMenu.tsx
 * Sandwich menu component that handles application-wide operations.
 *
 */
import styles from '../../styles/topbar.module.css'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import * as React from 'react'
import { VscMenu } from 'react-icons/vsc'
import {
    editorBackground,
    vscodeTextColor,
    // hoverBackground,
    hoverText,
} from '../../styles/vscodeStyles'

interface Props {
    saveAnnotationsToJson: () => void
    showKeyboardShortcuts: () => void
}

const GlobalMenu: React.FC<Props> = ({
    saveAnnotationsToJson,
    showKeyboardShortcuts,
}) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }
    const handleClose = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation()
        setAnchorEl(null)
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
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        // backgroundColor: editorBackground, // Doesn't seem to do anything
                        '&:hover': {
                            // color: vscodeTextColor, // background of item on hover
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
                    id={'global-action-button'}
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                >
                    <VscMenu
                        style={{
                            width: '20px',
                            height: '20px',
                        }}
                        className={styles['profileMenu']}
                    />
                </Button>
                <Menu
                    id={'global-action-menu'}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                        'aria-labelledby': 'annotation-action-button',
                    }}
                    PaperProps={{
                        style: { borderRadius: 4 },
                    }}
                >
                    <MenuItem
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.stopPropagation()
                            handleClose(e)
                            saveAnnotationsToJson()
                        }}
                    >
                        Save Annotations to JSON
                    </MenuItem>
                    {/* <MenuItem 
                        href=""
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.stopPropagation();  handleClose(e); showKeyboardShortcuts(); }}
                    >
                        Show Keyboard Shortcuts
                    </MenuItem> */}
                </Menu>
            </ThemeProvider>
        </>
    )
}

export default GlobalMenu
