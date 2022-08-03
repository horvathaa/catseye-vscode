/*
 *
 * searchbar.tsx
 * Component that Handles finding annotations that match a user's given query.
 *
 */
import * as React from 'react'
import { Annotation, Reply } from '../../../../constants/constants'
import { BiSearch } from 'react-icons/bi'
import styles from '../../styles/topbar.module.css'

interface Props {
    searchValueUpdated: (value: string) => void
}

const SearchBar: React.FC<Props> = ({ searchValueUpdated }) => {
    const [value, setValue] = React.useState('')
    // const link = ['url']

    const onChange = (value: string) => {
        // console.log('Search Bar Filtered Called')
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = (event.target as HTMLInputElement).value
        setValue(newVal)
        if (newVal == null || newVal == '') {
            // onChange('')
            searchValueUpdated('')
        } else {
            console.log('newVal:', newVal)
            console.log('val:', value)
            searchValueUpdated(newVal)
        }
    }

    return (
        <div className={styles['TopRow']}>
            <div className={styles['SearchBarContainer']}>
                <div className={styles['SearchIconOuter']}>
                    <BiSearch
                        className={styles['SearchIcon']}
                        onClick={() => searchValueUpdated(value)}
                    />
                </div>
                <div className={styles['SearchInputContainer']}>
                    {' '}
                    <input
                        className={styles['inputBox']}
                        value={value || ''}
                        placeholder={`Search annotations...`}
                        onChange={handleChange}
                        // onKeyDown={checkIfSubmit}
                    />
                </div>
            </div>
        </div>
    )
}

export default SearchBar
