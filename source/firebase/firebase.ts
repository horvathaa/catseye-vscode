import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

const config = {
// AMBER: message me for this data
  
};

firebase.initializeApp(config);
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

export default firebase;