import styles from '../../styles/topbar.module.css';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import * as React from 'react';
import { VscMenu } from 'react-icons/vsc';

interface Props {
    saveAnnotationsToJson: () => void;
    showKeyboardShortcuts: () => void;
}

const GlobalMenu: React.FC<Props> = ({
    saveAnnotationsToJson,
    showKeyboardShortcuts
}) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };
    const handleClose = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation();
        setAnchorEl(null);
    };
    const computedValue: string = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background');
    const foreground: string = getComputedStyle(document.body).getPropertyValue('--vscode-button-foreground');
    const theme = createTheme({
        palette: {
            primary: {
                main: `${computedValue}` 
            }
        },
        typography: {
            allVariants: {
                fontSize: 12,
                color: `${foreground}`,
                fontFamily: 'Arial'
            }
        },
        components: {
            MuiMenu: {
                styleOverrides: {
                    root: {
                        borderStyle: 'solid',
                        borderWidth: '0.15em',
                        borderColor: '#d4d4d44f'
                    }
                }
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'var(--vscode-editor-background)',
                        '&:hover': {
                            background: "var(--vscode-button-secondaryHoverBackground)",
                        }
                    },
                }
            },
            MuiList: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'var(--vscode-editor-background)'
                    }
                }
            }
        }
    });
    return (<>
        <ThemeProvider theme={theme}>
            <Button
                id={'global-action-button'}
                aria-controls={open ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
            >
                <VscMenu style={{ color: 'white', width: '20px', height: '20px' }} className={styles['profileMenu']} />
            </Button>
            <Menu
                id={'global-action-menu'}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'annotation-action-button'
                }}
            >
                <MenuItem 
                    href=""
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.stopPropagation(); handleClose(e); saveAnnotationsToJson(); }}
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
    </>)
};

export default GlobalMenu;