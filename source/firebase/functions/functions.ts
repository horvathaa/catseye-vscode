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
    BrowserOutput,
    CommitObject,
    WebSearchEvent,
} from '../../constants/constants'
import {
    browserOutputs,
    currentGitHubCommit,
    searchEvents,
    setAnnotationList,
    setBrowserOutputs,
    setSearchEvents,
    user,
    view,
} from '../../extension'
import {
    getListFromSnapshots,
    makeObjectListFromAnnotations,
    buildAnnotation,
    getLastGitCommitHash,
    removeNulls,
    partitionAnnotationsOnSignIn,
} from '../../utils/utils'
import firebase from '../firebase'
import { DB_COLLECTIONS } from '..'
import * as vscode from 'vscode'

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

// Save annotations to FireStore
export const saveAnnotations = (annotationList: Annotation[]): void => {
    const serializedObjects: { [key: string]: any }[] =
        makeObjectListFromAnnotations(annotationList)

    if (user) {
        serializedObjects.forEach((a: { [key: string]: any }) => {
            try {
                annotationsRef.doc(a.id).set(Object.assign({}, a))
            } catch (error) {
                console.error(`Could not save annotation ${a.id} to Firestore`)
                console.error(error)
                setAnnotationList(
                    annotationList.filter((anno) => anno.id !== a.id)
                )
            }
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
    console.log('mom?', userAnnotationDocs)
    const collaboratorAnnotationDocs: firebase.firestore.QuerySnapshot =
        await getAnnotationsByProject(currentGitProject, user.uid)
    console.log('colab?', collaboratorAnnotationDocs)
    if (
        (!userAnnotationDocs || userAnnotationDocs.empty) &&
        (!collaboratorAnnotationDocs || collaboratorAnnotationDocs.empty)
    )
        return []

    const dataAnnotations = getListFromSnapshots(userAnnotationDocs).concat(
        getListFromSnapshots(collaboratorAnnotationDocs)
    )

    const allCommits: CommitObject[] = getListFromSnapshots(
        await getCommitsByProject(currentGitProject)
    )
    const lastCommit = await getLastGitCommitHash()

    if (!lastCommit) return dataAnnotations
    const lastCommitObject: CommitObject | undefined = allCommits.find(
        (commit) => commit.commit === lastCommit
    )
    let currentAnchors: AnchorObject[] | { [key: string]: any }[] | undefined =
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
    currentAnchors: AnchorObject[] | { [key: string]: any }[] | undefined,
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
            const priorVersionFromCommit:
                | AnchorObject
                | { [key: string]: any }
                | undefined = commit.anchorsOnCommit.find(
                (priorAnchor: any) => {
                    return currAnchorObject.anchorId === priorAnchor.anchorId
                }
            )
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
    oauth: string
): Promise<firebase.User | null> => {
    const credential = firebase.auth.GithubAuthProvider.credential(oauth)
    const { user } = await firebase.auth().signInWithCredential(credential)
    return user
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
        commitsRef.doc(commit.commit).set(Object.assign({}, commit))
    }
}

export const emitEvent = (event: AnnotationEvent | AnnotationEvent[]) => {
    if (user) {
        Array.isArray(event)
            ? event.forEach((e) => eventsRef.doc(e.id).set(e))
            : eventsRef.doc(event.id).set(event)
    }
}

// should merge this into a generic snapshot listener or something sigh

export const listenForSearch = () => {
    if (!user) {
        return
    }
    return (
        db
            .collection(DB_COLLECTIONS.SEARCH)
            .where('uid', '==', user.uid)
            // .where('createdTimestamp', '>', new Date().getTime())
            .onSnapshot((searchSnapshot) => {
                // console.log('got search')
                searchSnapshot.docChanges().forEach((change) => {
                    const newEvent: WebSearchEvent =
                        change.doc.data() as WebSearchEvent
                    console.log('got these', change.doc.data())
                    switch (change.type) {
                        case 'added': {
                            setSearchEvents(searchEvents.concat(newEvent))
                            view?.sendNewSearchEvent(newEvent)
                            break
                        }
                        case 'modified': {
                            setSearchEvents(
                                searchEvents.map((s) =>
                                    s.id === newEvent.id ? newEvent : s
                                )
                            )
                            // need something here for generic rerender of search
                            break
                        }
                        case 'removed': {
                            setSearchEvents(
                                searchEvents.filter((s) => s.id !== newEvent.id)
                            )
                            break
                        }
                        default: {
                            return
                        }
                    }
                })
            })
    )
}

export const listenForOutput = () => {
    if (!user) {
        return
    }
    return (
        db
            .collection(DB_COLLECTIONS.OUTPUT)
            .where('uid', '==', user.uid)
            // .where('createdTimestamp', '>', new Date().getTime())
            .onSnapshot((outputSnapshot) => {
                // console.log('got search')
                outputSnapshot.docChanges().forEach((change) => {
                    const newOutput: BrowserOutput =
                        change.doc.data() as BrowserOutput
                    console.log('got these o', change.doc.data())
                    switch (change.type) {
                        case 'added': {
                            setBrowserOutputs(browserOutputs.concat(newOutput))
                            view?.sendNewBrowserOutput(newOutput)
                            break
                        }
                        case 'modified': {
                            setBrowserOutputs(
                                browserOutputs.map((o) =>
                                    o.id === newOutput.id ? newOutput : o
                                )
                            )
                            // need something here for generic rerender of search
                            break
                        }
                        case 'removed': {
                            setBrowserOutputs(
                                browserOutputs.filter(
                                    (o) => o.id !== newOutput.id
                                )
                            )
                            break
                        }
                        default: {
                            return
                        }
                    }
                })
            })
    )
}

export const updateOutput = (updatedOutput: BrowserOutput) => {
    return db
        .collection(DB_COLLECTIONS.OUTPUT)
        .doc(updatedOutput.id)
        .set(updatedOutput)
}
// myObject = { a: 1, b: 2, c: 3 }
// myObject = { a: 1, b: 2, c: 3 }
// newObject is now { 'a': 1, 'b': 4, 'c': 9 }
// newObject is now { 'a': 1, 'b': 4, 'c': 9 }
