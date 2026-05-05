import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (currentUser) {
      const phone = currentUser.email?.split('@')[0];
      const docId = phone || currentUser.uid;
      const userRef = doc(db, 'users', docId);
      const unsubscribeData = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as User;
          setUserData({ ...data, id: docSnap.id });
          
          // Migration: If user doesn't have a shortId, generate and save one
          if (!data.shortId) {
            const shortId = Math.floor(100000 + Math.random() * 900000).toString();
            try {
              const { updateDoc } = await import('firebase/firestore');
              await updateDoc(userRef, { shortId });
            } catch (e) {
              console.error("Migration Error:", e);
            }
          }
        } else {
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${docId}`);
        setLoading(false);
      });

      return unsubscribeData;
    }
  }, [currentUser]);

  const refreshUserData = async () => {
    if (!currentUser) return;
    const phone = currentUser.email?.split('@')[0];
    const docId = phone || currentUser.uid;
    const snap = await getDoc(doc(db, 'users', docId));
    if (snap.exists()) {
      setUserData({ ...snap.data() as User, id: snap.id });
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};
