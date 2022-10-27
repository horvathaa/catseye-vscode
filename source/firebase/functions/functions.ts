/*
 *
 * firebase/functions.ts
 * Functions for performing basic queries and operations that interface with FireStore
 *
 */

import {
    AnchorObject,
    AnchorOnCommit,
    AnchorsToUpdate,
    Annotation,
    AnnotationEvent,
    CommitObject,
} from '../../constants/constants'
import {
    annotationList,
    catseyeLog,
    currentGitHubCommit,
    gitApi,
    setAnnotationList,
    setGitInfo,
    setUser,
    user,
    view,
    extensionContext,
} from '../../extension'
import {
    getListFromSnapshots,
    makeObjectListFromAnnotations,
    buildAnnotation,
    getLastGitCommitHash,
    removeNulls,
    partitionAnnotationsOnSignIn,
    generateGitMetaData,
    initializeAnnotations,
} from '../../utils/utils'
import firebase from '../firebase'
import { DB_COLLECTIONS } from '..'
import * as vscode from 'vscode'
import { createView } from '../../commands/commands'

const db: firebase.firestore.Firestore = firebase.firestore()
const annotationsRef: firebase.firestore.CollectionReference = db.collection(
    DB_COLLECTIONS.VSCODE_ANNOTATIONS
)
const commitsRef: firebase.firestore.CollectionReference = db.collection(
    DB_COLLECTIONS.COMMITS
)

const eventsRef: firebase.firestore.CollectionReference = db.collection(
    DB_COLLECTIONS.EVENTS
)

const usersRef: firebase.firestore.CollectionReference = db.collection(
    DB_COLLECTIONS.USERS
)

// Save annotations to FireStore
export const saveAnnotations = (annotationList: Annotation[]): void => {
    const serializedObjects: { [key: string]: any }[] =
        makeObjectListFromAnnotations(annotationList)
    if (user) {
        serializedObjects.forEach((a: { [key: string]: any }) => {
            annotationsRef.doc(a.id).set(a)
        })
    }
}

export const saveOutOfDateAnnotations = (annotationIds: string[]): void => {
    annotationIds.forEach((id: string) => {
        annotationsRef.doc(id).update({ outOfDate: true })
    })
}

// Given user, pull in all of their not-deleted annotations
export const getAnnotationsOnSignIn = async (
    user: firebase.User,
    currentGitProject: string
): Promise<Annotation[]> => {
    const userAnnotationDocs: firebase.firestore.QuerySnapshot =
        await getUserAnnotations(user.uid)
    const collaboratorAnnotationDocs: Annotation[] =
        // await getAnnotationsByProject(currentGitProject, user.uid)
        []
    if (
        !userAnnotationDocs ||
        userAnnotationDocs.empty
        //  &&
        // (!collaboratorAnnotationDocs || collaboratorAnnotationDocs.empty)
    )
        return []

    const dataAnnotations = getListFromSnapshots(userAnnotationDocs).concat(
        // getListFromSnapshots(
        collaboratorAnnotationDocs
        // )
    )

    const allCommits: CommitObject[] = getListFromSnapshots(
        await getCommitsByProject(currentGitProject)
    )
    const lastCommit = await getLastGitCommitHash()
    if (!lastCommit) return dataAnnotations
    const lastCommitObject: CommitObject | undefined = allCommits.find(
        (commit) => commit.commit === lastCommit
    )
    let currentAnchors: AnchorObject[] | undefined =
        lastCommitObject?.anchorsOnCommit
    let [lastEditedAnnotations, uneditedAnnotations] =
        partitionAnnotationsOnSignIn(
            dataAnnotations,
            (a: any) => a.gitCommit === lastCommit
        )

    const populatedAnnoWithAnchorsWithPV: any[] = getPriorVersions(
        currentAnchors,
        lastEditedAnnotations,
        allCommits
    )

    const priorVersionAnnotations: Annotation[] = removeNulls(
        populatedAnnoWithAnchorsWithPV.map((a) => {
            const match = lastEditedAnnotations.find(
                (anno: any) => anno.id === a.annoId
            )
            if (!match) {
                return null
            }
            return buildAnnotation({ ...match, anchors: a.anchors })
        })
    )

    const remainingAnnotations: Annotation[] =
        uneditedAnnotations && uneditedAnnotations.length
            ? uneditedAnnotations.map((a: any) => {
                  return buildAnnotation({
                      ...a,
                      needToUpdate: false,
                  })
              })
            : []

    const allAnnotations = priorVersionAnnotations.concat(remainingAnnotations)

    return allAnnotations
}

// Helper function to populate anchors with prior versions. Returns annotations with populated anchor field
export const getPriorVersions = (
    currentAnchors: AnchorObject[] | undefined,
    lastEditedAnnotations: any[],
    allCommits: CommitObject[]
): any[] => {
    let inProgressAnnos: any[] = []
    currentAnchors?.forEach((currAnchorObject: any) => {
        // everything breaks if it doesnt find a match so this will have to do...
        const timeStamp: number = lastEditedAnnotations.find(
            (a: any) => a.id === currAnchorObject.parentId
        )
            ? lastEditedAnnotations.find(
                  (a: any) => a.id === currAnchorObject.parentId
              ).createdTimestamp
            : new Date().getTime()

        let objToUpdate: AnchorsToUpdate = inProgressAnnos.find(
            (a) => a.id === currAnchorObject.parentId
        )

        if (!objToUpdate) {
            objToUpdate = {
                annoId: currAnchorObject.parentId,
                anchors: [],
                createdTimestamp: timeStamp,
            }
            inProgressAnnos.push(objToUpdate)
        }

        let commitsSinceAnnoCreation = allCommits.filter(
            (c) =>
                c?.createdTimestamp &&
                c?.createdTimestamp >
                    (objToUpdate ? objToUpdate.createdTimestamp : timeStamp)
        )
        commitsSinceAnnoCreation.forEach((commit: CommitObject) => {
            // search commit history for previous AnchorObjects matching the current AnchorObject
            const priorVersionFromCommit: AnchorObject | undefined =
                commit.anchorsOnCommit.find((priorAnchor: any) => {
                    return currAnchorObject.anchorId === priorAnchor.anchorId
                })
            // if current anchor has any prior versions, create AnchorOnCommit objects
            let pv = objToUpdate?.anchors.find(
                (a: AnchorObject) => a.anchorId === currAnchorObject.anchorId
            )?.priorVersions
                ? objToUpdate.anchors.find(
                      (a: AnchorObject) =>
                          a.anchorId === currAnchorObject.anchorId
                  )?.priorVersions
                : []
            if (!pv) pv = []

            if (priorVersionFromCommit) {
                const priorVersion: AnchorOnCommit = {
                    id: priorVersionFromCommit.anchorId,
                    commitHash: commit.commit,
                    createdTimestamp: priorVersionFromCommit.createdTimestamp, // not updated
                    html: priorVersionFromCommit.html, // not updated correctly
                    anchorText: priorVersionFromCommit.anchorText,
                    branchName: commit.branchName,
                    stableGitUrl: priorVersionFromCommit.stableGitUrl,
                    anchor: priorVersionFromCommit.anchor,
                    path: priorVersionFromCommit.visiblePath,
                    surroundingCode: priorVersionFromCommit.surroundingCode,
                    anchorType: priorVersionFromCommit.anchorType,
                }
                pv = [...pv, { ...priorVersion }]
            }

            const updatedAnchorObject = {
                ...currAnchorObject,
                priorVersions: pv,
            }
            objToUpdate.anchors = objToUpdate.anchors
                .filter((a) => a.anchorId !== currAnchorObject.anchorId)
                .concat(updatedAnchorObject)
            inProgressAnnos = inProgressAnnos
                .filter((a: AnchorsToUpdate) => a.annoId !== objToUpdate.annoId)
                .concat(objToUpdate)
        })
    })
    return inProgressAnnos
}

// Authenticate using email and password (should only be used for super user)
export const fbSignInWithEmailAndPassword = async (
    email: string,
    password: string
): Promise<firebase.auth.UserCredential> => {
    return await firebase.auth().signInWithEmailAndPassword(email, password)
}

// Cloud function to find user in FireStore table given the GitHub API auth data
export const getUserGithubData = async (githubData: {
    [key: string]: any
}): Promise<firebase.functions.HttpsCallableResult> => {
    return await firebase.functions().httpsCallable('getUserGithubData')(
        githubData
    )
}

// Cloud function to set user's GitHub username in FireStore if we don't already have it
export const setUserGithubAccount = async (githubUserData: {
    [key: string]: any
}): Promise<firebase.functions.HttpsCallableResult> => {
    return await firebase.functions().httpsCallable('setUserGithubUsername')(
        githubUserData
    )
}

// Sign out of FireStore
export const fbSignOut = async (): Promise<void> => {
    await firebase.auth().signOut()
}

// Create and use credential given oauth data received from cloud function to sign in
export const signInWithGithubCredential = async (
    oauth: string,
    id: string = ''
): Promise<firebase.User | null> => {
    const credential = firebase.auth.GithubAuthProvider.credential(oauth)
    // console.log('hewwo?', credential)
    try {
        const { user } = await firebase.auth().signInWithCredential(credential)
        return user
        // console.log('this should not work', user)
    } catch (e) {
        console.error('wuh woh', e)
    }

    return null
}

// gitRepo is URL for project where annotation was made
export const getAnnotationsByProject = (
    gitRepo: string,
    uid: string
): Promise<firebase.firestore.QuerySnapshot> => {
    return annotationsRef
        .where('gitRepo', '==', gitRepo)
        .where('authorId', '!=', uid)
        .where('sharedWith', '==', 'group')
        .where(
            'gitCommit',
            '==',
            currentGitHubCommit ? currentGitHubCommit : ''
        )
        .get()
}

// get annos
// readonly ?? for anchors
//
export const listenForAnnotationsByProject = (gitRepo: string, uid: string) => {
    return annotationsRef
        .where('gitRepo', '==', gitRepo)
        .where('authorId', '!=', uid)
        .where('sharedWith', '==', 'group')
        .where('deleted', '==', false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const newAnnotation = change.doc.data() as Annotation
                newAnnotation.anchors.forEach((a) => (a.readOnly = true))
                switch (change.type) {
                    case 'added': {
                        setAnnotationList(annotationList.concat(newAnnotation))
                        break
                    }
                    case 'modified': {
                        setAnnotationList(
                            annotationList.map((a) =>
                                a.id === newAnnotation.id ? newAnnotation : a
                            )
                        )
                        break
                    }
                    // this should not happen as there are currently no ways for non-admins to remove annotations
                    // but still -- just in case!
                    case 'removed': {
                        setAnnotationList(
                            annotationList.filter(
                                (a) => a.id !== newAnnotation.id
                            )
                        )
                        break
                    }
                    default: {
                        break
                    }
                }

                view?.updateDisplay(annotationList)
            })
        })
}

export const getUserAnnotations = (
    uid: string
): Promise<firebase.firestore.QuerySnapshot> => {
    return annotationsRef
        .where('authorId', '==', uid)
        .where('deleted', '==', false)
        .where('outOfDate', '==', false)
        .get()
}

export const getCommitsByProject = (
    // need annotations for carousel version
    gitRepo: string
): Promise<firebase.firestore.QuerySnapshot> => {
    return commitsRef.where('gitRepo', '==', gitRepo).get()
}

export const getAnnotationsFromCommit = (
    // grab current state annotations
    commit: string
): Promise<firebase.firestore.QuerySnapshot> => {
    return commitsRef.where('commit', '==', commit).get()
}

export const saveCommit = (commit: CommitObject) => {
    if (user) {
        commitsRef.doc(commit.commit).set(commit)
    }
}

export const emitEvent = (event: AnnotationEvent | AnnotationEvent[]) => {
    if (user) {
        Array.isArray(event)
            ? event.forEach((e) => eventsRef.doc(e.id).set(e))
            : eventsRef.doc(event.id).set(event)
    }
}

export const waitForUser = async (githubId: string) => {
    return usersRef
        .where('githubId', '==', githubId)
        .onSnapshot(async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const doc = change.doc.data()
                // console.log('whats up doc', doc)
                if (doc.uid) {
                    await fbSignOut() // sign out su
                    const user = await signInWithGithubCredential(
                        doc.oauthGithub
                    )
                    // console.log('wha', user)
                    catseyeLog.appendLine(
                        'User created account -- now signed in'
                    )
                    setUser(user)
                    setGitInfo(await generateGitMetaData(gitApi))
                    if (user) {
                        await initializeAnnotations(user)
                        extensionContext && createView(extensionContext, true)
                        // view &&
                        //     view._panel?.visible &&
                        //     view.updateDisplay(
                        //         annotationList,
                        //         undefined,
                        //         undefined,
                        //         user.uid
                        //     )
                    } else {
                        setAnnotationList([])
                    }
                }
            })
        })
}
