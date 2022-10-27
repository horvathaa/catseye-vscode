/*
 *
 * authHelper.ts
 * Functionality to connect the VS Code extension to FireStore using GitHub auth
 *
 */

import * as vscode from 'vscode'
import {
    gitInfo,
    gitApi,
    setAnnotationList,
    setGitInfo,
    setUser,
    catseyeLog,
    view,
    annotationList,
} from '../extension'
import { initializeAnnotations, generateGitMetaData } from '../utils/utils'
import {
    fbSignInWithEmailAndPassword,
    getUserGithubData,
    fbSignOut,
    signInWithGithubCredential,
    waitForUser,
    // setUserGithubAccount,
} from '../firebase/functions/functions'
const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname).includes('\\')
        ? path.resolve(__dirname, '..\\..\\.env.local')
        : path.resolve(__dirname, '../../.env.local'),
})

const SCOPES = ['read:user', 'user:email', 'repo']

// Called on VS Code launch
export const initializeAuth = async () => {
    let session: vscode.AuthenticationSession | undefined
    const authSessionOptions: vscode.AuthenticationGetSessionOptions = {
        clearSessionPreference: false,
        createIfNone: true,
        // forceNewSession: true, // -- use for debugging and screenshot grabbing of first time user experience
    }
    try {
        // create VS Code GitHub auth session
        session = await vscode.authentication.getSession(
            'github',
            SCOPES,
            authSessionOptions
        )
    } catch (e) {
        catseyeLog.appendLine('Unable to create VS Code GitHub auth session')
        throw e
    }
    catseyeLog.appendLine('creating session')
    // console.log('session', session)
    if (session) {
        // get user auth token and account info
        const { accessToken, account } = session
        setGitInfo({ ...gitInfo, author: account.label })
        const id = account.id.toString()
        let result // operationMessage
        try {
            // use FireStore worker account to sign in so we can make cloud function calls
            if (process.env.FB_SU_EMAIL && process.env.FB_SU_PASSWORD) {
                await fbSignInWithEmailAndPassword(
                    process.env.FB_SU_EMAIL,
                    process.env.FB_SU_PASSWORD
                )
            }
        } catch (e) {
            catseyeLog.appendLine('Could not sign in to Firebase with SU')
            console.error(e)
            return
        }

        try {
            // send id to match on in firestore, send oauth to show we are Legit, cloud function returns github firestore auth data
            // use that data to login using sign in by credential
            // reverse -- user signs in to github with vscode - we store this data and then, upon having them create an account
            // using login credentials from webview (? not even sure that is legal tbh), pair accounts....?
            // using accessToken and user ID, query FireStore for matching user and token
            result = await getUserGithubData({ id: id, oauth: accessToken })
            if (result.data === '') {
                catseyeLog.appendLine(
                    'Could not get user GitHub data from Firebase -- redirecting to website'
                )

                vscode.env.openExternal(
                    vscode.Uri.parse(
                        // 'https://adamite.netlify.app/Login?how=github'
                        'http://localhost:3000/Login?how=github'
                    )
                )
                waitForUser(id)
                // setGitInfo({ ...gitInfo, oauth: accessToken })
                // await fbSignOut()
                // setUser(null)
                return
            } else {
                catseyeLog.appendLine(
                    'Got user GitHub Data with Cloud Function'
                )
            }
            // console.log('lmao wtf', result)
        } catch (e) {
            console.error(e)
            catseyeLog.appendLine(
                'Could not get user GitHub data from Firebase -- redirecting to website'
            )

            vscode.env.openExternal(
                vscode.Uri.parse('https://adamite.netlify.app/Login?how=github')
            )
            waitForUser(id)
            // setGitInfo({ ...gitInfo, oauth: accessToken })
            // await fbSignOut()
            // setUser(null)
            return
        }

        // sign out of super user account
        await fbSignOut()

        try {
            // sign in to FireStore with returned data
            const user = await signInWithGithubCredential(result?.data)
            catseyeLog.appendLine(
                'Signed in to Firebase with GitHub auth credentials'
            )
            setUser(user)
            setGitInfo(await generateGitMetaData(gitApi))
            if (user) {
                await initializeAnnotations(user)
                view &&
                    view._panel?.visible &&
                    view.updateDisplay(
                        annotationList,
                        undefined,
                        undefined,
                        user.uid
                    )
            } else {
                setAnnotationList([])
            }
        } catch (e) {
            catseyeLog.appendLine(
                'Could not sign in to Firebase with GitHub data'
            )
            console.error(e)
            setUser(null)
        }
    }
}
