/*
 * 
 * login.tsx
 * Component that displays an email and password field to support signing into FireStore.
 * Not used anymore since we use GitHub auth but 
 * it is a fallback in case that doesn't work for whatever reason.
 *
 */
import * as React from "react";
import styles from '../styles/login.module.css';
interface Props {
    vscode: any;
  }

const LogIn: React.FC<Props> = ({ vscode }) => {
    const [email, setEmail] = React.useState("");
    const [pass, setPass] = React.useState("");

    const postEmailAndPass = () => {
        vscode.postMessage({
            command: 'emailAndPassReceived',
            email: email,
            pass: pass
        })
    }

    return (
        <div className={styles['AuthContainer']}>
            <div className={`${styles.welcome}`}>
                Adamite for VS Code
            </div>
            <div className={`${styles.InputFieldContainer} ${styles.row}`}>
                <input type="text" value={email} placeholder="email" name="email" 
                onChange={(e) => setEmail(e.target.value)}/>
            </div>
            <div className={`${styles.InputFieldContainer} ${styles.row}`}>
                <input type="password" value={pass} placeholder="password" name="password" 
                onChange={(e) => setPass(e.target.value)}/>
            </div>
            <div className={`${styles.InputFieldContainer} ${styles.row}`}>
                <button type="submit" value="submit" onClick={() => postEmailAndPass()}>Submit</button>
            </div>
        </div>
    )
}

export default LogIn;