import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC26_CQoLSyY7g-ELXuKxludowTols1Nhk",
    authDomain: "holy-event-78a97.firebaseapp.com",
    projectId: "holy-event-78a97",
    storageBucket: "holy-event-78a97.firebasestorage.app",
    messagingSenderId: "80846305692",
    appId: "1:80846305692:web:ccb551490b632d7d4bb059",
    measurementId: "G-9GX2NL2N89"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


export default app;