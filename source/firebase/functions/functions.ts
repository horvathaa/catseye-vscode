/*
 *
 * firebase/functions.ts
 * Functions for performing basic queries and operations that interface with FireStore
 *
 */

import {
    AnchorObject,
    AnchorOnCommit,
    Annotation,
    CommitObject,
} from '../../constants/constants'
import { currentGitHubCommit, user } from '../../extension'
import {
    getListFromSnapshots,
    makeObjectListFromAnnotations,
    buildAnnotation,
} from '../../utils/utils'
import firebase from '../firebase'
import { DB_COLLECTIONS } from '..'

const db: firebase.firestore.Firestore = firebase.firestore()
const annotationsRef: firebase.firestore.CollectionReference = db.collection(
    DB_COLLECTIONS.VSCODE_ANNOTATIONS
)
const commitsRef: firebase.firestore.CollectionReference = db.collection(
    DB_COLLECTIONS.COMMITS
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
    currentGitProject: string,
    currentGitCommit: string
): Promise<Annotation[]> => {
    const userAnnotationDocs: firebase.firestore.QuerySnapshot =
        await getUserAnnotations(user.uid)
    const collaboratorAnnotationDocs: firebase.firestore.QuerySnapshot =
        await getAnnotationsByProject(currentGitProject, user.uid)
    if (
        (!userAnnotationDocs || userAnnotationDocs.empty) &&
        (!collaboratorAnnotationDocs || collaboratorAnnotationDocs.empty)
    )
        return []

    const dataAnnotations = getListFromSnapshots(userAnnotationDocs).concat(
        getListFromSnapshots(collaboratorAnnotationDocs)
    )
    console.log('dataAnnotations', dataAnnotations)
    const allCommits = getListFromSnapshots(
        await getCommitsByProject(currentGitProject)
    )
    const currentCommit: CommitObject | undefined = allCommits.find(
        (commit) => commit.commit === currentGitCommit
    )
    console.log('user when grabbing annotations', user)
    console.log('before if statement', currentCommit)
    console.log('ALL OF THEM FOR REAL', allCommits)
    console.log(
        'allcommits',
        allCommits.find((c: CommitObject) => {
            c.commit === '73531b78398caa82ebb24c26a1a6fafbe1197197'
        })
    )
    console.log('the first true 735', allCommits[1].anchorsOnCommit)
    console.log('current git commit', currentGitCommit)

    let populateAnnotations: Annotation[] = []

    // if (currentCommit) {
    const currentAnchors = allCommits[1].anchorsOnCommit

    console.log('currentAnchors?', currentAnchors)
    // populate current anchors with prior versions

    currentAnchors.forEach((anchorObject: any) => {
        allCommits.forEach((commit: CommitObject) => {
            // search commit history for previous AnchorObjects matching the current AnchorObject
            const priorVersionObjects: AnchorObject[] =
                commit.anchorsOnCommit.filter((priorAnchor: any) => {
                    return anchorObject.anchorId === priorAnchor.anchorId
                })
            console.log('prior versions', priorVersionObjects)
            // if current anchor has any prior versions, create AnchorOnCommit objects
            if (priorVersionObjects.length) {
                let priorVersions: AnchorOnCommit[] = []

                priorVersionObjects.forEach((anchorObject: AnchorObject) => {
                    const priorVersion: AnchorOnCommit = {
                        id: anchorObject.anchorId,
                        commitHash: commit.commit,
                        createdTimestamp: anchorObject.createdTimestamp,
                        html: anchorObject.html,
                        anchorText: anchorObject.anchorText,
                        branchName: commit.branchName,
                    }
                    priorVersions.push(priorVersion)
                })
                anchorObject.priorVersions = priorVersions
            }
        })
        // find annotation with matching id and set currentAnchor
        const anno = dataAnnotations.find((a: any) => {
            // maybe move earlier to get rid of extra computation LOL
            return a.id === anchorObject.parentId
        })
        console.log('anno!', anno, 'anchorObject', anchorObject)
        if (anno) {
            const annotation: Annotation = buildAnnotation({
                ...anno,
                anchors: [],
            })
            annotation.anchors.push(anchorObject)
            populateAnnotations.concat(annotation)
        }
    })
    // }
    // next -- get commits, associate annotations with anchors, incorporate file IO, (maybe) update annotation object to account for carousel versions of anchors

    // const annotations: Annotation[] =
    //     dataAnnotations && dataAnnotations.length
    //         ? dataAnnotations.map((a: any) => {
    //               return buildAnnotation({
    //                   ...a,
    //                   needToUpdate: false,
    //                   //   anchors: [
    //                   //       {
    //                   //           anchor: {
    //                   //               startLine: 0,
    //                   //               endLine: 1,
    //                   //               startOffset: 2,
    //                   //               endOffset: 3,
    //                   //           },
    //                   //           anchorText: 'dummy',
    //                   //           html: 'dummy',
    //                   //           filename: 'file',
    //                   //           gitUrl: 'file',
    //                   //           stableGitUrl: 'file',
    //                   //           visiblePath: 'file',
    //                   //           gitRepo: 'file',
    //                   //           gitBranch: 'file',
    //                   //           gitCommit: 'file',
    //                   //           anchorPreview: 'file',
    //                   //           programmingLang: 'file',
    //                   //           anchorId: 'file',
    //                   //           originalCode: 'file',
    //                   //           parentId: 'file',
    //                   //           anchored: true,
    //                   //           createdTimestamp: 0,
    //                   //           priorVersions: [],
    //                   //       },
    //                   //   ],
    //               })
    //           })
    //         : []
    console.log('populateAnnotations', populateAnnotations)

    return populateAnnotations
}

export const getPriorVersions = async (
    anchors: AnchorObject[],
    currentGitProject: string
): Promise<AnchorOnCommit[]> => {
    return []
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
    // console.log('gitRepo', gitRepo, 'uid', uid, 'currentGitHubCommit', currentGitHubCommit);
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
        .where('sharedWith', '==', 'private')
        .where('deleted', '==', false)
        .where('outOfDate', '==', false)
        .get()
}

export const getCommitsByProject = (
    // need annotations for carousel version
    gitRepo: string
): Promise<firebase.firestore.QuerySnapshot> => {
    // console.log('gitRepo', gitRepo, 'uid', uid, 'currentGitHubCommit', currentGitHubCommit);
    return commitsRef.where('gitRepo', '==', gitRepo).get()
}

export const getAnnotationsFromCommit = (
    // grab current state annotations
    commit: string
): Promise<firebase.firestore.QuerySnapshot> => {
    return commitsRef.where('commit', '==', commit).get()
}

export const saveCommit = (commit: CommitObject) => {
    console.log('user!', user)
    if (user) {
        console.log('saving to firestore....')
        commitsRef.doc(commit.commit).set(commit)
    }
}
