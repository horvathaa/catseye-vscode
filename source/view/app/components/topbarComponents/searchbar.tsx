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
    annotations: Annotation[]
    searchValueUpdated: (value: string) => void
}

const SearchBar: React.FC<Props> = ({ annotations, searchValueUpdated }) => {
    const [searchedAnnotations, setSearchedAnnotations] =
        React.useState<string>('')
    const [value, setValue] = React.useState('')
    const fields = ['annotation']
    const complex = ['anchors']
    const replies = ['replies']
    // const link = ['url']

    const onChange = (value: string) => {
        console.log('Search Bar Filtered Called')
        setSearchedAnnotations(value)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = (event.target as HTMLInputElement).value
        setValue(newVal)
        if (newVal == null || newVal == '') {
            searchValueUpdated('')
            setSearchedAnnotations('')
        } else {
            onChange(newVal)
            searchValueUpdated(newVal)
        }
    }

    // const checkIfSubmit = (event: React.KeyboardEvent) => {
    //     if (event.key === 'Enter') {
    //         searchValueUpdated(
    //             searchedAnnotations.sort(
    //                 (a: Annotation, b: Annotation) =>
    //                     b.createdTimestamp - a.createdTimestamp
    //             )
    //         )
    //     }
    // }

    return (
        <div className={styles['TopRow']}>
            <div className={styles['SearchBarContainer']}>
                <div className={styles['SearchIconOuter']}>
                    <BiSearch
                        className={styles['SearchIcon']}
                        onClick={() => searchValueUpdated(value)}
                    />
                </div>
                <div>
                    {' '}
                    <input
                        className={styles['inputBox']}
                        value={value || ''}
                        placeholder={`Search ${annotations.length} annotations...`}
                        onChange={handleChange}
                        // onKeyDown={checkIfSubmit}
                    />
                </div>
            </div>
            {searchedAnnotations.length > 0 && (
                <>
                    {searchedAnnotations.length === 1
                        ? `1 result`
                        : `${searchedAnnotations.length} results`}
                </>
            )}
        </div>
    )
}

export default SearchBar
