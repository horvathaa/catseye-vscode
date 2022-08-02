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
import { Selection } from '../../../constants/constants'
interface Props {
    massOperationSelected: (e: React.SyntheticEvent, operation: string) => void
    selectedStatus: Selection
}
// Add a bell/notification
const MassOperationsBar: React.FC<Props> = ({
    massOperationSelected,
    selectedStatus,
}) => {
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
                <Checkbox
                    checked={selectedStatus == Selection.all}
                    indeterminate={selectedStatus == Selection.partial}
                    onChange={(e) => {
                        console.log('checkbox selected')
                        massOperationSelected(e, 'select')
                    }}
                />
                <Card sx={{ flexGrow: 2 }}>
                    <AdamiteButton
                        buttonClicked={(e) => massOperationSelected(e, 'merge')}
                        name="Merge"
                        icon={<MergeIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={(e) => massOperationSelected(e, 'pin')}
                        name="Pin"
                        icon={<PushPinIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={(e) => massOperationSelected(e, 'share')}
                        name="Share"
                        icon={<ShareIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={(e) =>
                            massOperationSelected(e, 'resolve')
                        }
                        name="Resolve"
                        icon={<CheckIcon fontSize="small" />}
                    />
                    <AdamiteButton
                        buttonClicked={(e) =>
                            massOperationSelected(e, 'delete')
                        }
                        name="Delete"
                        icon={<DeleteIcon fontSize="small" />}
                    />
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default MassOperationsBar
