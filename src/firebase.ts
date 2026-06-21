import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBYRwq5xKFeNXvNf1vIB4MvehhjMEI_62s",
  authDomain: "barricade-c7a2c.firebaseapp.com",
  projectId: "barricade-c7a2c",
  storageBucket: "barricade-c7a2c.firebasestorage.app",
  messagingSenderId: "192248293032",
  appId: "1:192248293032:web:8f61cbde268634abcb049d",
  measurementId: "G-2ZXHFWP6BR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInAnonymously, signInWithPopup, onAuthStateChanged, signOut };
