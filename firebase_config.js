// Firebase Configuration
// This file is NOT in gitignore because it contains public config for the frontend.
// Security rules in Firestore will handle access control.

const firebaseConfig = {
    apiKey: "AIzaSyDkPhz_5SWzeeA_XjZWJyOPzwDqWnw_Djk",
    authDomain: "tmsascientists.firebaseapp.com",
    projectId: "tmsascientists",
    storageBucket: "tmsascientists.firebasestorage.app",
    messagingSenderId: "768940015725",
    appId: "1:768940015725:web:39301bc02e01739e4aff64",
    measurementId: "G-4VV999DJMV"
};

// We will initialize this in loader.js or app_v5.js
window.firebaseConfig = firebaseConfig;
