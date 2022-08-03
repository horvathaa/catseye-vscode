/*
 *
 * muiSplitButton.tsx
 * Split button used when creating a new annotation.
 *
 */
import * as React from 'react'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Grow from '@mui/material/Grow'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import { green } from '@material-ui/core/colors'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
    editorBackground,
    hoverBackground,
    hoverText,
} from '../../styles/vscodeStyles'

const options = ['Post as Private', 'Post to Collaborators']

interface Props {
    submissionHandler: (shareWith: string) => void
}

const SplitButton: React.FC<Props> = ({ submissionHandler }) => {
    const [open, setOpen] = React.useState(false)
    const anchorRef = React.useRef<HTMLDivElement>(null)
    const [selectedIndex, setSelectedIndex] = React.useState(0)

    const theme = createTheme({
        palette: {
            primary: {
                main: '#1e1e1e',
            },
        },
        typography: {
            allVariants: {
                fontSize: 12,
                color: 'white',
                fontFamily: 'Arial',
            },
        },
        components: {
            MuiButtonGroup: {
                styleOverrides: {
                    root: {
                        borderStyle: 'solid',
                        borderWidth: '0.15em',
                        // borderColor: '#d4d4d44f',
                        color: `${editorBackground}`,
                        backgroundColor: `${hoverText}`,
                        '&:hover': {
                            background: `${hoverText}`,
                        },
                    },
                    grouped: {
                        border: 'none',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderStyle: 'solid',
                        borderWidth: '0.15em',
                        // fontSize: '8px',
                        // borderColor: '#d4d4d44f',
                        color: `${editorBackground}`,
                        backgroundColor: `${hoverText}`,
                        textTransform: 'none',
                        '&:hover': {
                            background: `${hoverBackground}`,
                        },
                    },
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        color: `${editorBackground}`,
                        backgroundColor: `${hoverText}`,
                        '&:hover': {
                            background: `${hoverBackground}`,
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

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        const shareWith: string = selectedIndex === 0 ? 'private' : 'group'
        submissionHandler(shareWith)
    }

    const handleMenuItemClick = (
        event: React.MouseEvent<HTMLLIElement, MouseEvent>,
        index: number
    ) => {
        event.stopPropagation()
        setSelectedIndex(index)
        setOpen(false)
    }

    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setOpen((prevOpen) => !prevOpen)
    }

    const handleClose = (event: Event) => {
        event.stopPropagation()
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as HTMLElement)
        ) {
            return
        }

        setOpen(false)
    }

    return (
        <React.Fragment>
            <ThemeProvider theme={theme}>
                <ButtonGroup
                    size="small"
                    variant="contained"
                    ref={anchorRef}
                    aria-label="split button"
                >
                    <Button style={{ padding: '0 4px' }} onClick={handleClick}>
                        {options[selectedIndex]}
                    </Button>
                    <Button
                        size="small"
                        aria-controls={open ? 'split-button-menu' : undefined}
                        aria-expanded={open ? 'true' : undefined}
                        aria-label="select sharing level"
                        aria-haspopup="menu"
                        onClick={handleToggle}
                    >
                        <ArrowDropDownIcon />
                    </Button>
                </ButtonGroup>
                <Popper
                    open={open}
                    anchorEl={anchorRef.current}
                    role={undefined}
                    transition
                    disablePortal
                    placement={'top'}
                >
                    {({ TransitionProps, placement }) => (
                        <Grow
                            {...TransitionProps}
                            style={{
                                transformOrigin:
                                    placement === 'bottom'
                                        ? 'center top'
                                        : 'center bottom',
                            }}
                        >
                            <Paper>
                                <ClickAwayListener onClickAway={handleClose}>
                                    <MenuList id="split-button-menu">
                                        {options.map((option, index) => (
                                            <MenuItem
                                                key={option}
                                                selected={
                                                    index === selectedIndex
                                                }
                                                onClick={(event) =>
                                                    handleMenuItemClick(
                                                        event,
                                                        index
                                                    )
                                                }
                                            >
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </ThemeProvider>
        </React.Fragment>
    )
}

export default SplitButton
