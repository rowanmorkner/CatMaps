import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { auth, app } from '../config/firebase';

// Define a union type for user that works across platforms
type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {
    throw new Error('Not implemented');
  },
  signOut: async () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    if (Platform.OS === 'web') {
      // Web Firebase implementation
      const { onAuthStateChanged, getAuth } = require('firebase/auth');
      const webAuth = getAuth(app);
      
      unsubscribe = onAuthStateChanged(webAuth, (firebaseUser: any) => {
        if (firebaseUser) {
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          };
          setUser(user);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } else {
      // React Native Firebase implementation
      unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
        if (firebaseUser) {
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          };
          setUser(user);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    }

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      if (Platform.OS === 'web') {
        const { signInWithEmailAndPassword, getAuth } = require('firebase/auth');
        const webAuth = getAuth(app);
        await signInWithEmailAndPassword(webAuth, email, password);
      } else {
        await auth().signInWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      if (Platform.OS === 'web') {
        const { createUserWithEmailAndPassword, getAuth } = require('firebase/auth');
        const webAuth = getAuth(app);
        return await createUserWithEmailAndPassword(webAuth, email, password);
      } else {
        return await auth().createUserWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      if (Platform.OS === 'web') {
        const { signOut: webSignOut, getAuth } = require('firebase/auth');
        const webAuth = getAuth(app);
        await webSignOut(webAuth);
      } else {
        await auth().signOut();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign out');
      throw err;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};