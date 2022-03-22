import * as React from 'react';
import AuthorOperationButtons from './authorOperationButtons';
import { VscComment, VscFileSymlinkFile, VscPin, VscPinned, VscMenu } from 'react-icons/vsc';
import { BiAnchor } from 'react-icons/bi';
import styles from '../../styles/annotation.module.css';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { Tooltip } from '@material-ui/core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
interface Props {
    annotationId: string,
    userId: string,
    authorId: string;
    replyToAnnotation: () => void;
    editAnnotation: () => void;
    exportAnnotationAsComment: () => void;
    deleteAnnotation: (e: React.SyntheticEvent) => void;
    // snapshotCode: (e: React.SyntheticEvent, id: string) => void;
    pinAnnotation: () => void;
    addAnchor: () => void;
    pinned: boolean;
  }
  
const AnnotationOperationButtons: React.FC<Props> = ({ 
        annotationId, 
        userId, 
        authorId, 
        replyToAnnotation, 
        exportAnnotationAsComment, 
        editAnnotation, 
        deleteAnnotation, 
        // snapshotCode, 
        pinAnnotation,
        addAnchor,
        pinned 
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
    
    return (
        <div className={styles['buttonRow']}>
            <div className={styles['AnnotationIconsContainer']}>
                <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); replyToAnnotation(); }} className={styles['DropdownItemOverwrite']}>
                    <div className={styles['DropdownIconsWrapper']}>
                        <Tooltip title="Reply">
                            <div>
                                <VscComment className={styles['profileMenu']} />
                            </div>
                        </Tooltip>
                    </div>
                </div> 
                <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); exportAnnotationAsComment(); }} className={styles['DropdownItemOverwrite']}>
                    <div className={styles['DropdownIconsWrapper']}>
                        <Tooltip title="Export As Comment">
                            <div>
                                <VscFileSymlinkFile className={styles['profileMenu']} />
                            </div>
                        </Tooltip>
                    </div>
                </div>
                <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); pinAnnotation(); }} className={styles['DropdownItemOverwrite']}>
                    <div className={styles['DropdownIconsWrapper']}>
                        {pinned ?
                            <Tooltip title="Un-pin">
                                <div>
                                    <VscPinned className={styles['profileMenu']} /> 
                                </div>
                            </Tooltip> :
                            <Tooltip title="Pin">
                                <div>
                                    <VscPin className={styles['profileMenu']} /> 
                                </div>
                            </Tooltip>
                        }
                    </div>
                </div>
                <div onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); addAnchor(); }} className={styles['DropdownItemOverwrite']}>
                    <div className={styles['DropdownIconsWrapper']}>
                        <Tooltip title="Add Anchor">
                            <div>
                                <BiAnchor className={styles['profileMenu']} />
                            </div>
                        </Tooltip>
                    </div>
                </div>

                {userId === authorId && <AuthorOperationButtons editAnnotation={editAnnotation} deleteAnnotation={deleteAnnotation} />}
            </div>
            <div className={styles['AnnotationsOptions']}>
                <ThemeProvider theme={theme}>
                    <Button
                        id={annotationId + '-annotation-action-button'}
                        aria-controls={open ? 'basic-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={open ? 'true' : undefined}
                        onClick={handleClick}
                    >
                        <VscMenu style={{ color: 'white' }} className={styles['profileMenu']} />
                    </Button>
                    <Menu
                        id={annotationId + '-annotation-action-menu'}
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        MenuListProps={{
                            'aria-labelledby': 'annotation-action-button'
                        }}
                    >
                        <MenuItem 
                            href=""
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.stopPropagation(); handleClose(e); replyToAnnotation(); }}
                        >
                            Reply
                        </MenuItem>
                        <MenuItem 
                            href=""
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.stopPropagation();  handleClose(e); exportAnnotationAsComment(); }}
                        >
                            Export as Comment
                        </MenuItem>
                        <MenuItem 
                            href=""
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {  e.stopPropagation; handleClose(e); addAnchor(); }}
                        >
                            Add Anchor
                        </MenuItem>
                        <MenuItem 
                            href=""
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {  handleClose(e); pinAnnotation(); }}
                        >
                            {pinned ? `Un-pin` : `Pin`}
                        </MenuItem>
                        {userId === authorId && (
                            <div key={annotationId+'-author-menu'}>
                                <MenuItem 
                                    href=""
                                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.stopPropagation(); handleClose(e); editAnnotation(); }}
                                >
                                    Edit
                                </MenuItem>
                                <MenuItem 
                                    href=""
                                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.stopPropagation(); handleClose(e); deleteAnnotation(e); }}
                                >
                                    Delete
                                </MenuItem>
                            </div>
                        )}
                    </Menu>
                </ThemeProvider>
            </div>
        </div>
    )
}

export default AnnotationOperationButtons;