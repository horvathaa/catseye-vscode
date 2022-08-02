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
import { createTheme, styled } from '@mui/material/styles'
import styles from '../../styles/annotation.module.css'
import BugReportIcon from '@mui/icons-material/BugReport' // Issue
import TaskIcon from '@mui/icons-material/Task' // Task
import AssignmentIcon from '@mui/icons-material/Assignment' // Proposal
import { useMediaQuery } from '@material-ui/core'
import { ContactSupport } from '@mui/icons-material'
import { breakpoints } from '../../utils/viewUtils'

interface TypesProps {
    currentTypes: Type[]
    editTypes: (newTypes: Type[]) => void
    small?: boolean
}

const AnnotationTypesBar: React.FC<TypesProps> = ({
    currentTypes,
    editTypes,
    small = true,
}) => {
    const [types, setTypes] = React.useState<Type[]>(currentTypes)
    const allTypes = Object.values(Type)

    React.useEffect(() => {
        // console.log('new types', currentTypes)
        // console.log('old types', types)
    }, [currentTypes])

    const typesWithIcons = {
        issue: <BugReportIcon fontSize="small" />,
        proposal: <AssignmentIcon fontSize="small" />,
        task: <TaskIcon fontSize="small" />,
        question: <ContactSupport fontSize="small" />,
    }

    // console.log('types state value', types)

    const theme = createTheme({
        breakpoints: breakpoints,
        typography: {
            allVariants: {
                fontSize: 14,
                color: `${vscodeTextColor}`,
                fontFamily: 'Arial',
            },
        },
    })

    // Concept learned from https://dev.to/christensenjoe/using-breakpoints-in-materialui-5gj0
    const isMedOrMore = useMediaQuery(theme.breakpoints.up('md'))
    const isSmOrMore = useMediaQuery(theme.breakpoints.up('lg'))

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
            updatedTypes = types.filter((obj: Type) => obj !== selectedType)
        } else {
            // Can't mutate the types array like done previously!
            updatedTypes = [selectedType].concat(types)
        }
        console.log('updated in handleAnnoClick', updatedTypes)
        setTypes(updatedTypes)
        editTypes(updatedTypes)
    }
    // Can we make the flex
    return (
        <span>
            {allTypes.map((type: Type, id) => {
                return (
                    <CustomChip
                        // style={{
                        //     display: 'flex',
                        // }}
                        key={id}
                        label={isMedOrMore ? type : typesWithIcons[type]}
                        icon={isMedOrMore ? typesWithIcons[type] : undefined}
                        color={types.includes(type) ? 'primary' : 'default'}
                        variant={types.includes(type) ? 'default' : 'outlined'}
                        size={small === true ? 'small' : undefined}
                        onClick={() => handleAnnoClick(type)}
                    />
                )
            })}
        </span>
    )
}

export default AnnotationTypesBar
