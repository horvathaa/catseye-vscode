import { Checkbox } from '@mui/material'
import * as React from 'react'
import { WebSearchEvent, WebCopyData } from '../../../constants/constants'
import styles from '../styles/searchEvents.module.css'
import { cardStyle } from '../styles/vscodeStyles'
import { formatTimestamp } from '../utils/viewUtils'

interface SearchEventProps {
    searchEvent: WebSearchEvent
    addToBundle: (obj: any) => void
    removeFromBundle: (obj: any) => void
}

export const SearchEvent: React.FC<SearchEventProps> = ({
    searchEvent,
    addToBundle,
    removeFromBundle,
}) => {
    const [selected, setSelected] = React.useState<boolean>(false)

    const printCopyData = (copyData: WebCopyData) => {
        const jsx: React.ReactElement[] = []
        for (let key of Object.keys(copyData)) {
            jsx.push(
                <div>
                    On <a href={key}>{key}</a>, copied{' '}
                    <ul>
                        {copyData[key].map((data, i) => {
                            return (
                                <li key={data + i}>
                                    <pre>{data}</pre>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )
        }
        return jsx
    }

    const { padding, paddingBottom, ...rest } = cardStyle

    const searches = [...new Set(searchEvent.search.map((s) => s.search))]

    const str = searches
        .map((d, i) => `"${d}"${i === searches.length - 1 ? '' : ', '}`)
        .join('')

    const handleSelected = () => {
        const newSel = !selected
        if (newSel) {
            addToBundle(searchEvent)
        } else {
            removeFromBundle(searchEvent)
        }
        setSelected(newSel)
    }

    return (
        <div className={styles['flex']}>
            <Checkbox
                checked={selected}
                onChange={handleSelected}
                inputProps={{ 'aria-label': 'controlled' }}
            />
            <div
                style={rest}
                className={`${styles['overflow-scroll']} ${styles['flex-col']} ${styles['p2']} ${styles['border-1px-medium']} ${styles['border-radius-8']}`}
            >
                <div className={`${styles['justify-end']}`}>
                    {formatTimestamp(searchEvent.startTime)}
                </div>
                <div>
                    Searched {str} and visited:{' '}
                    <ul>
                        {searchEvent.urls?.map((u: string, idx: number) => {
                            return (
                                <li key={u + idx + '-li'}>
                                    <a href={u} key={u + idx + '-a'}>
                                        {u}
                                    </a>
                                </li>
                            )
                        })}
                    </ul>
                    {Object.keys(searchEvent.copyData).length > 0
                        ? printCopyData(searchEvent.copyData)
                        : null}
                </div>
            </div>
        </div>
    )
}

interface Props {
    searchEvents: WebSearchEvent[]
    addToBundle: (obj: any) => void
    removeFromBundle: (obj: any) => void
}

export const SearchEvents: React.FC<Props> = ({
    searchEvents,
    addToBundle,
    removeFromBundle,
}) => {
    return (
        <div>
            {searchEvents
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .map((s) => (
                    <SearchEvent
                        key={s.createdTimestamp}
                        searchEvent={s}
                        addToBundle={addToBundle}
                        removeFromBundle={removeFromBundle}
                    />
                ))}
        </div>
    )
}
