/*
 *
 * massOperationsBar.tsx
 * Component below filters above annotation list with mass action options
 *
 */
import * as React from 'react'
import styles from '../styles/topbar.module.css'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import MergeIcon from '@mui/icons-material/Merge'
import ShareIcon from '@mui/icons-material/Share'
import PushPinIcon from '@mui/icons-material/PushPin'
import { Card, Checkbox, createTheme, ThemeProvider } from '@mui/material'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
} from '../styles/vscodeStyles'
import AdamiteButton from './annotationComponents/AdamiteButton'
interface Props {
    massOperationSelected: (operation: string) => void
}
// Add a bell/notification
const MassOperationsBar: React.FC<Props> = ({ massOperationSelected }) => {
    // MUI doesn't accept CSS version of this for some reason..?
    const cardStyle = {
        backgroundColor: editorBackground,
        color: vscodeTextColor,
        margin: 4,
        border: '1.5px',
        borderColor: iconColor,
        borderRadius: '4px',
        borderStyle: 'solid',
        padding: 5,
        flexGrow: 1,
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
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundColor: `${editorBackground} !important`,
                        color: `${vscodeTextColor} !important`,
                        margin: 4,
                        border: '1.5px',
                        borderColor: `${iconColor} !important`,
                        borderRadius: '4px',
                        borderStyle: 'dashed',
                        padding: 5,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    },
                },
            },
        },
    })

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
            }}
        >
            <ThemeProvider theme={theme}>
                <Checkbox onChange={() => massOperationSelected('select')} />
                <Card sx={{ flexGrow: 2 }}>
                    <AdamiteButton
                        buttonClicked={() => massOperationSelected('merge')}
                        name="Merge"
                        icon={<MergeIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={() => massOperationSelected('pin')}
                        name="Pin"
                        icon={<PushPinIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={() => massOperationSelected('share')}
                        name="Share"
                        icon={<ShareIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={() => massOperationSelected('resolve')}
                        name="Resolve"
                        icon={<CheckIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={() => massOperationSelected('delete')}
                        name="Delete"
                        icon={<DeleteIcon fontSize="small" />}
                    />
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default MassOperationsBar
