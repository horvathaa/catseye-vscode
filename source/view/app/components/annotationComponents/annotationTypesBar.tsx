import * as React from 'react'
import Chip from '@material-ui/core/Chip'
import { Type } from '../../../../constants/constants'
import {
    editorBackground,
    hoverBackground,
    hoverText,
    iconColor,
    vscodeTextColor,
} from '../../styles/vscodeStyles'
import { styled } from '@mui/material/styles'
import BugReportIcon from '@mui/icons-material/BugReport' // Issue
import QuestionMarkIcon from '@mui/icons-material/QuestionMark' // Question
import TaskIcon from '@mui/icons-material/Task' // Task
import AssignmentIcon from '@mui/icons-material/Assignment' // Proposal

interface TypesProps {
    currentTypes: Type[]
    editTypes: (newTypes: Type[]) => void
}

const AnnotationTypesBar: React.FC<TypesProps> = ({
    currentTypes,
    editTypes,
}) => {
    const allTypes = Object.values(Type)

    const typesWithIcons = {
        issue: <BugReportIcon />,
        proposal: <AssignmentIcon />,
        task: <TaskIcon />,
        question: <QuestionMarkIcon />,
    }

    const [types, setTypes] = React.useState<Type[]>(currentTypes)

    // https://mui.com/material-ui/guides/typescript/#customization-of-theme
    // could not get theme overrides to work :(
    const CustomChip = styled(Chip)({
        '&.MuiChip-clickable': {
            backgroundColor: editorBackground,
            color: vscodeTextColor,
            borderColor: iconColor,
            border: '1.2px solid',
            margin: '3px',
            '&:hover': {
                backgroundColor: hoverBackground,
                color: hoverText,
            },
        },
        '&.MuiChip-clickableColorPrimary': {
            backgroundColor: hoverText,
            color: editorBackground,
            border: 'none',
            '&:hover': {
                backgroundColor: hoverText,
                color: editorBackground,
            },
        },
    }) as typeof Chip

    const handleAnnoClick = (selectedType: Type) => {
        let updatedTypes: Type[]
        if (types.includes(selectedType)) {
            updatedTypes = types.filter((obj) => obj !== selectedType)
        } else {
            types.push(selectedType)
            updatedTypes = types
        }
        setTypes(updatedTypes)
        editTypes(types)
    }

    return (
        <div>
            {allTypes.map((type: Type, id) => {
                return (
                    <CustomChip
                        key={id}
                        label={type}
                        icon={typesWithIcons[type]}
                        color={types.includes(type) ? 'primary' : 'default'}
                        variant={types.includes(type) ? 'default' : 'outlined'}
                        size="small"
                        onClick={() => handleAnnoClick(type)}
                    />
                )
            })}
        </div>
    )
}

export default AnnotationTypesBar
