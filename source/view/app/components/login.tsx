import * as React from "react";

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
        <div>
            Email:
            <input type="text" value={email} placeholder="email" name="email" 
                onChange={(e) => setEmail(e.target.value)}/>
            Password:
            <input type="password" value={pass} placeholder="password" name="password" 
                onChange={(e) => setPass(e.target.value)}/>
            <input type="submit" value="submit" onClick={() => postEmailAndPass()} />
        </div>
    )
}

export default LogIn;