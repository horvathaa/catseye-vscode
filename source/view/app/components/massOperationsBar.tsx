/*
 *
 * massOperationsBar.tsx
 * Component below filters above annotation list with mass action options
 *
 */
import * as React from 'react'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import MergeIcon from '@mui/icons-material/Merge'
import ShareIcon from '@mui/icons-material/Share'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import { Card, Checkbox, createTheme, ThemeProvider } from '@mui/material'
import {
    editorBackground,
    iconColor,
    vscodeTextColor,
} from '../styles/vscodeStyles'
import CatseyeButton from './annotationComponents/CatseyeButton'
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
                    <CatseyeButton
                        buttonClicked={(e) => massOperationSelected(e, 'merge')}
                        name="Merge Selected Annotations"
                        icon={<MergeIcon fontSize="small" />}
                    />
                    <CatseyeButton
                        buttonClicked={(e) => massOperationSelected(e, 'pin')}
                        name="Pin Selected Annotations"
                        icon={<PushPinOutlinedIcon fontSize="small" />}
                    />
                    <CatseyeButton
                        buttonClicked={(e) => massOperationSelected(e, 'share')}
                        name="Share Selected Annotations"
                        icon={<ShareIcon fontSize="small" />}
                    />
                    <CatseyeButton
                        buttonClicked={(e) =>
                            massOperationSelected(e, 'resolve')
                        }
                        name="Resolve Selected Annotations"
                        icon={<CheckIcon fontSize="small" />}
                    />
                    <CatseyeButton
                        buttonClicked={(e) =>
                            massOperationSelected(e, 'delete')
                        }
                        name="Delete Selected Annotations"
                        icon={<DeleteIcon fontSize="small" />}
                    />
                </Card>
            </ThemeProvider>
        </div>
    )
}

export default MassOperationsBar
