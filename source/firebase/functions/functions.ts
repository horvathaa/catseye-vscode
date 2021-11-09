import Annotation from '../../constants/constants';
import { user } from '../../extension';
import { getListFromSnapshots, makeObjectListFromAnnotations, buildAnnotation } from '../../utils/utils';
import firebase from '../firebase';
import { DB_COLLECTIONS } from '..';

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

export const getAnnotationsOnSignIn = async (user: firebase.User) : Promise<Annotation[]> => {
	const db: firebase.firestore.Firestore = firebase.firestore();
	const annotationsRef: firebase.firestore.CollectionReference = db.collection(DB_COLLECTIONS.VSCODE_ANNOTATIONS);
	const docs: firebase.firestore.QuerySnapshot = await annotationsRef
														.where('authorId', '==', user.uid)
														.where('deleted', '==', false)
														.where('outOfDate', '==', false)
														.get();
	if(!docs || docs.empty) return []
	// const { data } = await getGithubUsernameForAnnotations(getListFromSnapshots(docs));
	const dataAnnotations = getListFromSnapshots(docs);
	// const annotations: Annotation[] = data.annotations && data.annotations.length ? data.annotations.map((a: any) => {
	// 	return buildAnnotation(a);
	// }) : [];
	const annotations: Annotation[] = dataAnnotations && dataAnnotations.length ? dataAnnotations.map((a: any) => {
		return buildAnnotation(a);
	}) : [];
	return annotations;
}

export const fbSignInWithEmailAndPassword = async (email: string, password: string) : Promise<firebase.auth.UserCredential> => {
	return await firebase.auth().signInWithEmailAndPassword(email, password);
}

export const getUserGithubData = async ( githubData: {[key: string] : any} ) : Promise<firebase.functions.HttpsCallableResult> => {
	return await firebase.functions().httpsCallable('getUserGithubData')(githubData);
}

export const setUserGithubAccount = async (githubUserData: {[key: string] : any}) : Promise<firebase.functions.HttpsCallableResult> => {
	return await firebase.functions().httpsCallable('setUserGithubUsername')(githubUserData);
}

export const getGithubUsernameForAnnotations = async ( annotations: {[key: string] : any}[] ) : Promise<firebase.functions.HttpsCallableResult> => {
	return await firebase.functions().httpsCallable('getGithubUsernamesForAnnotations')({ annotations: annotations });
}

export const fbSignOut = async () : Promise<void> => {
	await firebase.auth().signOut();
}

export const signInWithGithubCredential = async (oauth: string) : Promise<firebase.User | null> => {
	const credential = firebase.auth.GithubAuthProvider.credential(oauth);
    const { user } = await firebase.auth().signInWithCredential(credential);
	return user;
}