/*
 * 
 * firebase/functions.ts
 * Functions for performing basic queries and operations that interface with FireStore
 *
 */

import { Annotation } from '../../constants/constants';
import { currentGitHubCommit, user } from '../../extension';
import { getListFromSnapshots, makeObjectListFromAnnotations, buildAnnotation } from '../../utils/utils';
import firebase from '../firebase';
import { DB_COLLECTIONS } from '..';

const db: firebase.firestore.Firestore = firebase.firestore();
const annotationsRef: firebase.firestore.CollectionReference = db.collection(DB_COLLECTIONS.VSCODE_ANNOTATIONS);

// Save annotations to FireStore
export const saveAnnotations = (annotationList: Annotation[]) : void => {
    const serializedObjects: {[key: string] : any}[] = makeObjectListFromAnnotations(annotationList);
	if(user) {
		const db = firebase.firestore();
		const annotationsRef = db.collection(DB_COLLECTIONS.VSCODE_ANNOTATIONS);
		serializedObjects.forEach((a: {[key: string] : any}) => {
			annotationsRef.doc(a.id).set(a)
		});
    }
}

// Given user, pull in all of their not-deleted annotations
export const getAnnotationsOnSignIn = async (user: firebase.User, currentGitProject: string) : Promise<Annotation[]> => {
	const userAnnotationDocs: firebase.firestore.QuerySnapshot = await getUserAnnotations(user.uid);
	const collaboratorAnnotationDocs: firebase.firestore.QuerySnapshot = await getAnnotationsByProject(currentGitProject, user.uid);
	console.log('collabo', collaboratorAnnotationDocs, getListFromSnapshots(collaboratorAnnotationDocs));
	if(
		(!userAnnotationDocs || userAnnotationDocs.empty) && 
		(!collaboratorAnnotationDocs || collaboratorAnnotationDocs.empty)
	) return []
	const dataAnnotations = getListFromSnapshots(userAnnotationDocs).concat(getListFromSnapshots(collaboratorAnnotationDocs));
	const annotations: Annotation[] = dataAnnotations && dataAnnotations.length ? dataAnnotations.map((a: any) => {
		return buildAnnotation( { ...a, needToUpdate: false } );
	}) : [];
	return annotations;
}

// Authenticate using email and password (should only be used for super user)
export const fbSignInWithEmailAndPassword = async (email: string, password: string) : Promise<firebase.auth.UserCredential> => {
	return await firebase.auth().signInWithEmailAndPassword(email, password);
}

// Cloud function to find user in FireStore table given the GitHub API auth data 
export const getUserGithubData = async ( githubData: {[key: string] : any} ) : Promise<firebase.functions.HttpsCallableResult> => {
	return await firebase.functions().httpsCallable('getUserGithubData')(githubData);
}

// Cloud function to set user's GitHub username in FireStore if we don't already have it
export const setUserGithubAccount = async (githubUserData: {[key: string] : any}) : Promise<firebase.functions.HttpsCallableResult> => {
	return await firebase.functions().httpsCallable('setUserGithubUsername')(githubUserData);
}

// Sign out of FireStore
export const fbSignOut = async () : Promise<void> => {
	await firebase.auth().signOut();
}

// Create and use credential given oauth data received from cloud function to sign in
export const signInWithGithubCredential = async (oauth: string) : Promise<firebase.User | null> => {
	const credential = firebase.auth.GithubAuthProvider.credential(oauth);
    const { user } = await firebase.auth().signInWithCredential(credential);
	return user;
}

// gitRepo is URL for project where annotation was made
export const getAnnotationsByProject = (gitRepo: string, uid: string) : Promise<firebase.firestore.QuerySnapshot> => {
	return annotationsRef
		.where('gitRepo', '==', gitRepo)
		.where('authorId', '!=', uid)
		.where('sharedWith', '==', 'group')
		.where('gitCommit', '==', currentGitHubCommit)
		.get();
}

export const getUserAnnotations = (uid: string) : Promise<firebase.firestore.QuerySnapshot> => {
	return annotationsRef
		.where('authorId', '==', uid)
		.where('deleted', '==', false)
		.where('outOfDate', '==', false)
		.get();
}