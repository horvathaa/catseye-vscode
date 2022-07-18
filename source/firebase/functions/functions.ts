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
    getLastGitCommitHash,
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

    console.log('data annotations', dataAnnotations)

    const allCommits = getListFromSnapshots(
        await getCommitsByProject(currentGitProject)
    )
    const lastCommit = await getLastGitCommitHash()
    const lastCommitObject: CommitObject | undefined = allCommits.find(
        (commit) => commit.commit === lastCommit
    )
    console.log(
        'current git commit',
        currentGitCommit,
        'last git commit',
        lastCommit
    )
    console.log('last recent CommitObject', lastCommitObject)
    console.log('ALL COMMITS FOR REAL', allCommits)

    const currentAnchors = lastCommitObject?.anchorsOnCommit
    console.log('touched anchors on last commit', currentAnchors)

    /* IN GENERAL: 
    - need to populate all annotations with anchors (always)
    - need to populate said anchors with prior versions (if any)

    ASSUME: Annotation commit is most up to date. 

    Some annotations will not have changed. Their commit will not be the last commit (perhaps their anchors sh already exist) 
    For unchanged anno --> iterate through all AnchorObjects and find annotations with matching id 
    
    All anchor points have an annotation. Could be many.
    FACT: no. of anchors >= no. of annotations. This means iterating through all annotations is computationally LESS $$. 
        For each annotation: 
            allCommits.find(annotation.commit == commitObject.commit) // search all commits and find the commit object 
            commitObject.anchorsOnCommit.forEach => 

    PROPOSAL: Annotations stores an anchors array. We reset the anchors array only if anchors changing 
    
    NOW: Anchor commits are source of truth. 
        HOW NOW?: Iterate through all AnchorObjects, find their Annotation via parentID and populate its anchors array. 
        BAD: $$$$. no. of anchors >= no. of annotations. 
        MAKE BETTER: differentiate between AnchorObjects that've changed. 
    
    
    MAYBE: If an anchor's commit == lastCommit, compute a priorVersion because it has changed., 

    
    
    CONSIDER: if anchor commit changed, should its annotation commit also update? 

    */

    const partition = (array: any[], filter: any) => {
        let lastCommit: any = [],
            otherCommit: any = []
        array.forEach((a, idx, arr) => {
            console.log('a', a, 'idx', idx, 'arr', arr)
            return (filter(a, idx, arr) ? lastCommit : otherCommit).push(a)
        })
        return [lastCommit, otherCommit]
    }

    //Run it with some dummy data and filter
    const [lastEditedAnnotations, uneditedAnnotations] = partition(
        dataAnnotations,
        (a: any) => a.gitCommit === lastCommit
    )
    let priorAnchorsAnnotations: Annotation[] = []

    console.log('last commit anno', lastEditedAnnotations)
    console.log('undedited anno', uneditedAnnotations)

    lastEditedAnnotations.forEach((a: any) => {
        currentAnchors?.forEach((currAnchorObject: any) => {
            allCommits.forEach((commit: CommitObject) => {
                console.log('searching all commits for prior anchors')
                // search commit history for previous AnchorObjects matching the current AnchorObject
                const priorVersionObjects: AnchorObject[] =
                    commit.anchorsOnCommit.filter((priorAnchor: any) => {
                        console.log(
                            'filtering',
                            currAnchorObject.anchorId === priorAnchor.anchorId
                        )
                        return (
                            currAnchorObject.anchorId === priorAnchor.anchorId
                        )
                    })
                console.log('prior versions', priorVersionObjects)
                // if current anchor has any prior versions, create AnchorOnCommit objects
                if (priorVersionObjects.length) {
                    let priorVersions: AnchorOnCommit[] =
                        currAnchorObject.priorVersions
                            ? currAnchorObject.priorVersions
                            : []
                    priorVersionObjects.forEach(
                        (anchorObject: AnchorObject) => {
                            const priorVersion: AnchorOnCommit = {
                                id: anchorObject.anchorId,
                                commitHash: commit.commit,
                                createdTimestamp: anchorObject.createdTimestamp,
                                html: anchorObject.html,
                                anchorText: anchorObject.anchorText,
                                branchName: commit.branchName,
                            }
                            priorVersions.push(priorVersion)
                            // anchorObject.priorVersions
                            //     ? anchorObject.priorVersions.push(priorVersion)
                            //     : priorVersions
                        }
                    )
                    currAnchorObject.priorVersions = priorVersions
                }
            })
            a = buildAnnotation({
                ...a,
                anchors: currAnchorObject,
            })
        })
        priorAnchorsAnnotations.push(a)
    })

    const remainingAnnotations: Annotation[] =
        uneditedAnnotations && uneditedAnnotations.length
            ? uneditedAnnotations.map((a: any) => {
                  return buildAnnotation({
                      ...a,
                      needToUpdate: false,
                  })
              })
            : []

    const allAnnotations = priorAnchorsAnnotations.concat(remainingAnnotations)
    console.log('populateAnnotations', allAnnotations)

    return allAnnotations
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
        // usersRef.doc(user.uid).update({ lastCommit: commit.commit })
    }
}
