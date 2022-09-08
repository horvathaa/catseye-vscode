/*
 *
 * userProfile.tsx
 * Component used in annotation, replies, and snapshots to show who and at what time created the artifact
 * of interest. Uses user's GitHub profile picture.
 *
 */
import * as React from 'react'
import styles from '../../styles/annotation.module.css'
import { formatTimestamp } from '../../utils/viewUtils'
// import { breakpoints, formatTimestamp } from '../../utils/viewUtils'
// import { createTheme } from '@mui/material'

interface Props {
    githubUsername: string
    createdTimestamp: number
    lastEditTime: number
}

const UserProfile: React.FC<Props> = ({
    githubUsername,
    createdTimestamp,
    lastEditTime,
}) => {
    const userHasImage: boolean =
        githubUsername !== undefined && githubUsername !== ''
    const timeString: string = `created on ${formatTimestamp(createdTimestamp)}`
    const editTimeJsx = <i>last edited on {formatTimestamp(lastEditTime)}</i>

    // const theme = createTheme({
    //     breakpoints: breakpoints,
    // })

    // const isSmOrMore = useMediaQuery(theme.breakpoints.up('sm'))

    return (
        <div className={styles['userContainer']}>
            {userHasImage && (
                <img
                    src={
                        'https://github.com/' + githubUsername + '.png?size=40'
                    }
                    className={`${styles['userProfilePhoto']} ${styles['profilePhoto']}`}
                    alt="github user profile image"
                />
            )}
            <div className={styles['usernameAndTimeContainer']}>
                <a
                    href={'https://github.com/' + githubUsername}
                    className={styles['username']}
                >
                    {githubUsername}
                </a>
                {timeString}
                {createdTimestamp !== lastEditTime ? editTimeJsx : null}
            </div>
        </div>
    )
}

export default UserProfile
