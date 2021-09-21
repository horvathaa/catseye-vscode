import * as React from "react";
import '../styles/login.css';
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
        <div className="AuthContainer">
            <div className="InputFieldContainer row">
                <input type="text" value={email} placeholder="email" name="email" 
                onChange={(e) => setEmail(e.target.value)}/>
            </div>
            <div className="InputFieldContainer row">
                <input type="password" value={pass} placeholder="password" name="password" 
                onChange={(e) => setPass(e.target.value)}/>
            </div>
            <div className="InputFieldContainer row">
                <button type="submit" value="submit" onClick={() => postEmailAndPass()}>Submit</button>
            </div>
        </div>
    )
}

export default LogIn;