import * as vscode from 'vscode';
import { gitInfo, gitApi, setAnnotationList, setGitInfo, setUser, adamiteLog } from '../extension';
import { initializeAnnotations, generateGitMetaData } from '../utils/utils';
import { fbSignInWithEmailAndPassword, getUserGithubData, fbSignOut, signInWithGithubCredential, setUserGithubAccount } from '../firebase/functions/functions';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname).includes('\\') ? path.resolve(__dirname, '..\\..\\.env.local') : path.resolve(__dirname, '..\/..\/.env.local') });

const SCOPES = ['read:user', 'user:email', 'repo'];

export const initializeAuth = async () => {
    let session;
    const authSessionOptions: vscode.AuthenticationGetSessionOptions = {
        clearSessionPreference: false,
        createIfNone: true
    };
    try {
        session = await vscode.authentication.getSession('github', SCOPES, authSessionOptions);
    } catch (e) {
        adamiteLog.appendLine("Unable to create VS Code GitHub auth session");
        throw e;
    }
    adamiteLog.appendLine('creating session');

    if(session) {
        const { accessToken, account } = session;
        setGitInfo({ ...gitInfo, author: account.label });
        const id = account.id.toString();
        let result, operationMessage;
        try {
            if(process.env.FB_SU_EMAIL && process.env.FB_SU_PASSWORD)
            await fbSignInWithEmailAndPassword(process.env.FB_SU_EMAIL, process.env.FB_SU_PASSWORD);
        } catch(e) {
            adamiteLog.appendLine('Could not sign in to Firebase with SU');
            console.error(e);
            return;
        }
        try {
            result = await getUserGithubData({ id: id, oauth: accessToken });
            adamiteLog.appendLine("Got user GitHub Data with Cloud Function");
        } catch(e) {
            console.error(e);
            adamiteLog.appendLine('Could not get user GitHub data from Firebase');
            await fbSignOut();
            setUser(null);
            return;
        }
        
        await fbSignOut();
    
        try {
            const user = await signInWithGithubCredential(result?.data);
            adamiteLog.appendLine("Signed in to Firebase with GitHub auth credentials");
            setUser(user);
            setGitInfo(await generateGitMetaData(gitApi));
            user ? await initializeAnnotations(user) : setAnnotationList([]);
            if(user)
            try {
                operationMessage = await setUserGithubAccount({ uid: user.uid, username: account.label});
            }
            catch(e) {
                adamiteLog.appendLine('Could not set GitHub data');
                console.error(e);
            }
        } catch(e) {
            adamiteLog.appendLine('Could not sign in to Firebase with GitHub data');
            console.error(e);
            setUser(null);
        }

    }
}