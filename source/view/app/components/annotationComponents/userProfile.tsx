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

interface Props {
    githubUsername: string
    createdTimestamp: number
}

const UserProfile: React.FC<Props> = ({ githubUsername, createdTimestamp }) => {
    const userHasImage: boolean =
        githubUsername !== undefined && githubUsername !== ''
    const time: string = formatTimestamp(createdTimestamp)
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
                {time}
            </div>
        </div>
    )
}

export default UserProfile
