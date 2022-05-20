/*
 * 
 * authHelper.ts
 * Functionality to connect the VS Code extension to FireStore using GitHub auth
 *
 */

import * as vscode from 'vscode';
import { gitInfo, gitApi, setAnnotationList, setGitInfo, setUser, adamiteLog } from '../extension';
import { initializeAnnotations, generateGitMetaData } from '../utils/utils';
import { fbSignInWithEmailAndPassword, getUserGithubData, fbSignOut, signInWithGithubCredential, setUserGithubAccount, dropAnnotations } from '../firebase/functions/functions';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname).includes('\\') ? path.resolve(__dirname, '..\\..\\.env.local') : path.resolve(__dirname, '..\/..\/.env.local') });

const SCOPES = ['read:user', 'user:email', 'repo'];

// Called on VS Code launch
export const initializeAuth = async () => {
    let session;
    const authSessionOptions: vscode.AuthenticationGetSessionOptions = {
        clearSessionPreference: false,
        createIfNone: true
    };
    try {
        // create VS Code GitHub auth session
        session = await vscode.authentication.getSession('github', SCOPES, authSessionOptions);
    } catch (e) {
        adamiteLog.appendLine("Unable to create VS Code GitHub auth session");
        throw e;
    }
    adamiteLog.appendLine('creating session');

    if(session) {
        // get user auth token and account info
        const { accessToken, account } = session;
        setGitInfo({ ...gitInfo, author: account.label });
        const id = account.id.toString();
        let result, operationMessage;
        try {
            // use FireStore worker account to sign in so we can make cloud function calls
            if(process.env.FB_SU_EMAIL && process.env.FB_SU_PASSWORD)
            await fbSignInWithEmailAndPassword(process.env.FB_SU_EMAIL, process.env.FB_SU_PASSWORD);
        } catch(e) {
            adamiteLog.appendLine('Could not sign in to Firebase with SU');
            console.error(e);
            return;
        }
        try {
            // using accessToken and user ID, query FireStore for matching user and token
            result = await getUserGithubData({ id: id, oauth: accessToken });
            adamiteLog.appendLine("Got user GitHub Data with Cloud Function");
        } catch(e) {
            console.error(e);
            adamiteLog.appendLine('Could not get user GitHub data from Firebase');
            await fbSignOut();
            setUser(null);
            return;
        }
        
        // sign out of super user account
        await fbSignOut();
    
        try {
            // sign in to FireStore with returned data
            const user = await signInWithGithubCredential(result?.data);
            adamiteLog.appendLine("Signed in to Firebase with GitHub auth credentials");
            setUser(user);
            setGitInfo(await generateGitMetaData(gitApi));
            user ? await initializeAnnotations(user) : setAnnotationList([]);
            if(user)
            try {
                operationMessage = await setUserGithubAccount({ uid: user.uid, username: account.label });
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