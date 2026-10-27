// Δημόσια Firebase client configuration.
// ΔΕΝ είναι μυστικό: η ασφάλεια των δεδομένων βασίζεται στους Firestore Security Rules.
// Αντικατέστησε τις τιμές PASTE_... με αυτές από
// Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup and configuration.
// ΜΗΝ βάλεις εδώ service-account credentials ή private keys.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

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
