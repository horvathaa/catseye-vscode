import * as vscode from 'vscode';
import { setAnnotationList, setUser } from '../extension';
import { initializeAnnotations } from '../utils/utils';
import { fbSignInWithEmailAndPassword, getUserGithubData, fbSignOut, signInWithGithubCredential } from '../firebase/functions/functions';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname).includes('\\') ? path.resolve(__dirname, '..\\..\\.env.local') : path.resolve(__dirname, '..\/..\/.env.local') });

const SCOPES = ['read:user', 'user:email', 'repo'];

export const initializeAuth = async () => {
    let session;
    try {
        session = await vscode.authentication.getSession('github', SCOPES, { createIfNone: true });
    } catch (e) {
        throw e;
    }

    if(session) {
        const { accessToken, account } = session;
        const id = account.id.toString();
        let result;
        try {
            if(process.env.FB_SU_EMAIL && process.env.FB_SU_PASSWORD)
            await fbSignInWithEmailAndPassword(process.env.FB_SU_EMAIL, process.env.FB_SU_PASSWORD);
        } catch(e) {
            console.error(e);
            return;
        }
        try {
            result = await getUserGithubData({ id: id, oauth: accessToken });
        } catch(e) {
            console.error(e);
            await fbSignOut();
            setUser(null);
            return;
        }
        await fbSignOut();
        try {
            const user = await signInWithGithubCredential(result?.data);
            setUser(user);
            user ? await initializeAnnotations(user) : setAnnotationList([]);
        } catch(e) {
            console.error(e);
            setUser(null);
        }
    }
}