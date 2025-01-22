'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface AuthContextType {
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Create user document if it doesn't exist
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        userId: result.user.uid,
        createdAt: new Date().toISOString(),
      }, { merge: true }); // merge: true prevents overwriting if document exists
      
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error;
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        userId: userCredential.user.uid,
        createdAt: new Date().toISOString(),
      });

      return userCredential;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }

  const value = {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 