import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..\\..\\.env.local')});

const config = {
    apiKey: process.env.FB_API_KEY,
    authDomain: process.env.FB_AUTH_DOMAIN,
    projectId: process.env.FB_PROJECT_ID,
    storageBucket: process.env.FB_STORAGE_BUCKET,
    messagingSenderId: process.env.FB_MESSAGING_SENDER_ID,
    appId: process.env.FB_APP_ID,
    measurementId: process.env.FB_MEASUREMENT_ID 
}

firebase.initializeApp(config);

export default firebase;