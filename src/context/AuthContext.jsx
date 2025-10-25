import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase-config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // RESTORED
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          // --- CHECK FOR BAN STATUS ---
          if (userData.isBanned) {
            // If the user is banned, force logout and deny access
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false); // Reset isAdmin status
            setLoading(false);
            return;
          }
          // ---------------------------------
          
          // RESTORED: Check for Admin status
          setIsAdmin(!!userData.isAdmin); 
        } else {
          // RESTORED: Default non-admin if doc doesn't exist
          setIsAdmin(false);
        }
      } else {
        // RESTORED: Reset admin status on logout
        setIsAdmin(false);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, isAdmin }; // RESTORED isAdmin to value

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}