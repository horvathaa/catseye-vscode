/*
 *
 * firebase/index.ts
 * Hub for exporting all FireStore-related stuff
 *
 */

import firebase from './firebase'
require('firebase/functions')

export const DB_COLLECTIONS = {
    USERS: 'users',
    ANNOTATIONS: 'annotations',
    VSCODE_ANNOTATIONS: 'vscode-annotations',
    COMMITS: 'commits',
    GROUPS: 'groups',
    EVENTS: 'vscode-events',
    SEARCH: 'search-events',
    OUTPUT: 'browser-output',
    BUNDLE: 'bundle',
}

export let db = firebase.firestore()
export let auth = firebase.auth()
export const googleProvider = new firebase.auth.GoogleAuthProvider()
export const githubProvider = new firebase.auth.GithubAuthProvider()
export const getCurrentUser = () => firebase.auth().currentUser
export const getCurrentUserId = () => {
    let currentUser = getCurrentUser()
    if (currentUser) {
        return currentUser.uid
    } else {
        return null
    }
}
