import * as React from 'react'
import { WebSearchEvent, WebCopyData } from '../../../constants/constants'
import styles from '../styles/searchEvents.module.css'
import { cardStyle } from '../styles/vscodeStyles'
import { formatTimestamp } from '../utils/viewUtils'

interface SearchEventProps {
    searchEvent: WebSearchEvent
}

const SearchEvent: React.FC<SearchEventProps> = ({ searchEvent }) => {
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

    return (
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
    )
}

interface Props {
    searchEvents: WebSearchEvent[]
}

export const SearchEvents: React.FC<Props> = ({ searchEvents }) => {
    return (
        <div>
            {searchEvents
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .map((s) => (
                    <SearchEvent key={s.createdTimestamp} searchEvent={s} />
                ))}
        </div>
    )
}
