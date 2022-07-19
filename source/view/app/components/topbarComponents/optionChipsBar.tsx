import * as React from 'react'
import Chip from '@material-ui/core/Chip'
import { Option } from '../../../../constants/constants'
import {
    editorBackground,
    hoverBackground,
    hoverText,
    iconColor,
    vscodeTextColor,
} from '../../styles/vscodeStyles'
import { createTheme, styled } from '@mui/material/styles'
import styles from '../../styles/topbar.module.css'
import { useMediaQuery } from '@material-ui/core'
import { breakpoints } from '../../utils/viewUtils'

// Key-value: https://stackoverflow.com/questions/36467469/is-key-value-pair-available-in-typescript
interface OptionsProps {
    label: string
    initOptions: Option[]
    editOptions: (newOptions: Option[]) => void
    small?: boolean
}

const OptionChipsBar: React.FC<OptionsProps> = ({
    label,
    initOptions,
    editOptions,
    small = true,
}) => {
    const [options, setOptions] = React.useState<Option[]>(initOptions)

    const theme = createTheme({
        breakpoints: breakpoints,
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

    const handleOptClick = (selectedOption: Option) => {
        // Maybe would be faster with a Map? Likely unnecessary optimization though.
        // Change value of object inside array:
        // https://stackoverflow.com/questions/4689856/how-to-change-value-of-object-which-is-inside-an-array-using-javascript-or-jquer
        const updatedOptions = options.map((option: Option) =>
            option.name == selectedOption.name
                ? { ...option, selected: !option.selected }
                : option
        )
        setOptions(updatedOptions)
        editOptions(options)
    }
    return (
        <div className={styles['RowContainer']}>
            <div className={styles['OptionLabel']}>
                {label}:{'  '}
            </div>
            {options.map((option: Option, id) => {
                return (
                    <CustomChip
                        key={id}
                        label={isMedOrMore ? option.name : option.icon}
                        icon={isMedOrMore ? option.icon : undefined}
                        color={option.selected === true ? 'primary' : 'default'}
                        variant={
                            option.selected === true ? 'default' : 'outlined'
                        }
                        size={small === true ? 'small' : undefined}
                        onClick={() => handleOptClick(option)}
                    />
                )
            })}
        </div>
    )
}

export default OptionChipsBar
