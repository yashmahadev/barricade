import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBYRwq5xKFeNXvNf1vIB4MvehhjMEI_62s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "barricade-c7a2c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "barricade-c7a2c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "barricade-c7a2c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "192248293032",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:192248293032:web:8f61cbde268634abcb049d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2ZXHFWP6BR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInAnonymously, signInWithPopup, onAuthStateChanged, signOut };
