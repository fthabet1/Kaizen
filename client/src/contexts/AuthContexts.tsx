'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    User,
    updateProfile
} from 'firebase/auth';
import axios from '../utils/axiosConfig';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authError: string | null;
    token: string | null;
    isReady: boolean; // Add this line
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;  
    logout: () => Promise<void>;
  }

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    
    // Set up axios interceptor to include the token
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              setUser(firebaseUser);
              const idToken = await firebaseUser.getIdToken();
              setToken(idToken);
              
              // Register or update user in our backend
              try {
                await registerUserInBackend(firebaseUser, idToken);
              } catch (error) {
                console.error('Error registering user in backend', error);
              }
            } else {
              // User is not authenticated
              setUser(null);
              setToken(null);
            }
          } catch (error) {
            console.error('Auth state change error:', error);
          } finally {
            setLoading(false);
            setIsReady(true); // Set ready state when auth is done
          }
        });
    
        return () => unsubscribe();
      }, []);

    // Helper function to register user in backend
    const registerUserInBackend = async (firebaseUser: User, idToken: string) => {
        try {
            // Set the token in axios headers for this request
            const headers = {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            };
            
            // Make the API call to register/update user in backend
            await axios.post('/api/users/register', {
                auth_id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || ''
            }, { headers });
            
            console.log('User registered/updated in backend successfully');
        } catch (error) {
            console.error('Failed to register user in backend:', error);
            throw error;
        }
    };

    // Sign in with email and password (Firebase)
    const signInWithEmail = async (email: string, password: string) => {
        try {
            setAuthError(null);
            setLoading(true);
            await signInWithEmailAndPassword(firebaseAuth, email, password);
            // Note: User registration in backend will be handled by the auth state change listener
        } catch (error: unknown) {
            setAuthError((error as Error).message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signUpWithEmail = async (email: string, password: string, name: string) => {
        try {
            setAuthError(null);
            setLoading(true);
            
            // Create the user
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
            
            // Update the profile with the name
            if (userCredential.user) {
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                
                // Get fresh token after profile update
                const idToken = await userCredential.user.getIdToken(true);
                
                // Explicitly register in backend here for newly created users
                await registerUserInBackend(userCredential.user, idToken);
            }
        } catch (error: unknown) {
            setAuthError((error as Error).message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Sign in with Google (Firebase)
    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();

        try {
            setAuthError(null);
            setLoading(true);
            await signInWithPopup(firebaseAuth, provider);
            // Note: User registration in backend will be handled by the auth state change listener
        } catch (error: unknown) {
            setAuthError((error as Error).message);
            throw error;
        } finally {
            setLoading(false);
        }
    }

    // Logout from Firebase
    const logout = async () => {
        try {
            setAuthError(null);
            await signOut(firebaseAuth);
        } catch (error: unknown) {
            setAuthError((error as Error).message);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        authError,
        token,
        isReady, // Add this line
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout
      };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}