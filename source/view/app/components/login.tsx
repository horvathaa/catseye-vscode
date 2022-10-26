/*
 *
 * login.tsx
 * Component that displays an email and password field to support signing into FireStore.
 * Not used anymore since we use GitHub auth but
 * it is a fallback in case that doesn't work for whatever reason.
 *
 */
import * as React from 'react'
import styles from '../styles/login.module.css'
interface Props {
    vscode: any
}

const LogIn: React.FC<Props> = ({ vscode }) => {
    return (
        <div className={styles['AuthContainer']}>
            <div className={`${styles.welcome}`}>Catseye</div>
            <div className={`${styles.InputFieldContainer} ${styles.row} `}>
                <button
                    onClick={() =>
                        vscode.postMessage({ command: 'requestOpenSignInPage' })
                    }
                >
                    Login with GitHub
                </button>
            </div>
        </div>
    )
}

export default LogIn
