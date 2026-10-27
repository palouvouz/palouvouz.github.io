// Δημόσια Firebase client configuration.
// ΔΕΝ είναι μυστικό: η ασφάλεια των δεδομένων βασίζεται στους Firestore Security Rules.
// Αντικατέστησε τις τιμές PASTE_... με αυτές από
// Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup and configuration.
// ΜΗΝ βάλεις εδώ service-account credentials ή private keys.

/*import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "PASTE_API_KEY",
    authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_PROJECT_ID",
    storageBucket: "PASTE_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "PASTE_SENDER_ID",
    appId: "PASTE_APP_ID"
};

export const isConfigured =
    !firebaseConfig.apiKey.startsWith("PASTE_") &&
    !firebaseConfig.projectId.startsWith("PASTE_");

export const app = initializeApp(firebaseConfig);


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDt_sFx2cvYXQVOMMlm_GSvBqOTcZFfZpU",
  authDomain: "palouvouz-github-io.firebaseapp.com",
  projectId: "palouvouz-github-io",
  storageBucket: "palouvouz-github-io.firebasestorage.app",
  messagingSenderId: "663910545320",
  appId: "1:663910545320:web:0bff86677ca5e0d2ae0f9d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
*/


/*
 * Firebase configuration για GitHub Pages.
 * Χρησιμοποιεί το επίσημο Firebase CDN.
 * Τα δικαιώματα προστατεύονται από τους Firestore Security Rules.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyDt_sFx2cvYXQVOMMlm_GSvBqOTcZFfZpU",
    authDomain: "palouvouz-github-io.firebaseapp.com",
    projectId: "palouvouz-github-io",
    storageBucket: "palouvouz-github-io.firebasestorage.app",
    messagingSenderId: "663910545320",
    appId: "1:663910545320:web:0bff86677ca5e0d2ae0f9d"
};

export const isConfigured =
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.startsWith("PASTE_") &&
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.projectId.startsWith("PASTE_");

export const app = initializeApp(firebaseConfig);
