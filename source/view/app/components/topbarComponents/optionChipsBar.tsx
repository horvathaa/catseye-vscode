import * as React from 'react'
import Chip from '@material-ui/core/Chip'
import { Option, OptionGroup } from '../../../../constants/constants'
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
    initOptions: OptionGroup
    editOptions: (newOptions: OptionGroup) => void
    small?: boolean
}

const OptionChipsBar: React.FC<OptionsProps> = ({
    initOptions,
    editOptions,
    small = true,
}) => {
    const [options, setOptions] = React.useState<Option[]>(initOptions.options)

    React.useEffect(() => {
        setOptions(initOptions.options)
    }, [initOptions])

    const theme = createTheme({
        breakpoints: breakpoints,
    })

    // Concept learned from https://dev.to/christensenjoe/using-breakpoints-in-materialui-5gj0
    const isMedOrMore = useMediaQuery(theme.breakpoints.up('md'))

    // https://mui.com/material-ui/guides/typescript/#customization-of-theme
    // could not get theme overrides to work :(
    const CustomChip = styled(Chip)({
        '&.MuiChip-clickable': {
            backgroundColor: editorBackground,
            color: vscodeTextColor,
            borderColor: iconColor,
            border: `1.2px solid rgba(${iconColor}, 0.3)`,
            margin: '3px',
            alignItems: 'flex-start',
            paddingLeft: '2px',
            '&:hover': {
                backgroundColor: hoverBackground,
                color: hoverText,
            },
        },
        '&.MuiChip-clickableColorPrimary': {
            backgroundColor: hoverText,
            color: editorBackground,
            border: 'none',
            alignItems: 'center',
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
        editOptions({ label: initOptions.label, options: updatedOptions })
    }
    return (
        <div className={styles['RowContainer']}>
            <div className={styles['OptionLabel']}>
                {initOptions.label}:{'  '}
            </div>
            {options.map((option: Option, id) => {
                return (
                    <CustomChip
                        key={'chip' + option.name + id}
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
