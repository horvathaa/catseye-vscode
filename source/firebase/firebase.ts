import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
// @ts-ignore
import { config } from './secrets.app.js';

firebase.initializeApp(config);
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

export default firebase;