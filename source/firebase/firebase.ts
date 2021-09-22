import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

const config = {
    apiKey: "AIzaSyDDs8lNI6hgbu-Y6Jjhx0RETyk3-gd_060",
    authDomain: "adamite-b86e5.firebaseapp.com",
    projectId: "adamite-b86e5",
    storageBucket: "adamite-b86e5.appspot.com",
    messagingSenderId: "644799342321",
    appId: "1:644799342321:web:2b16d43ddedf59d69dab50",
    measurementId: "G-SVJ90HQ6Z9"
};

firebase.initializeApp(config);
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

export default firebase;