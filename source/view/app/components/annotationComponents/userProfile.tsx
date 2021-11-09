import * as React from 'react';
import styles from '../../styles/annotation.module.css';
import { formatTimestamp } from '../../viewUtils';

interface Props {
    githubUsername: string,
    createdTimestamp: number
}

const UserProfile: React.FC<Props> = ({ githubUsername, createdTimestamp }) => {
    const userHasImage: boolean = githubUsername !== undefined && githubUsername !== "";

    return (
        <div className={styles['userContainer']}>
            {userHasImage && <img src={'https://github.com/' + githubUsername + '.png?size=40'} className={`${styles['userProfilePhoto']} ${styles['profilePhoto']}`} alt='github user profile image' />}
            <div className={styles['usernameAndTimeContainer']}>
                <a href={'https://github.com/' + githubUsername} className={styles['username']}>
                    {githubUsername}
                </a>
                {formatTimestamp(createdTimestamp)}
            </div>
        </div>
    )
}

export default UserProfile;