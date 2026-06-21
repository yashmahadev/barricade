import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userStats: { gamesPlayed: number; wins: number; losses: number; trophies: number } | null;
  loginGoogle: () => Promise<void>;
  loginAnon: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Helper to check/create user doc
const ensureUserDoc = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  let stats = { gamesPlayed: 0, wins: 0, losses: 0, trophies: 0 };
  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || `Guest-${user.uid.slice(0,4)}`,
      gamesPlayed: 0,
       wins: 0,
       losses: 0,
       trophies: 0,
       createdAt: new Date()
    });
  } else {
    stats = {
       gamesPlayed: snapshot.data().gamesPlayed || 0,
       wins: snapshot.data().wins || 0,
       losses: snapshot.data().losses || 0,
       trophies: snapshot.data().trophies || 0,
    };
  }
  return stats;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<{gamesPlayed: number, wins: number, losses: number, trophies: number} | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const stats = await ensureUserDoc(u);
        setUserStats(stats);
      } else {
        setUserStats(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  const loginAnon = async () => {
    await signInAnonymously(auth);
  };
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, userStats, loginGoogle, loginAnon, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
