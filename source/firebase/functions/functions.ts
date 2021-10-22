import Annotation from '../../constants/constants';
import { v4 as uuidv4 } from 'uuid';
import { user } from '../../extension';
import { makeObjectListFromAnnotations } from '../../utils/utils';
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
