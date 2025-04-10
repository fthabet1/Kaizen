/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    User,
    updateProfile,
    updatePassword as firebaseUpdatePassword
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
    isReady: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;  
    logout: () => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    
    const tokenRef = useRef<string | null>(null);

    // Set up axios interceptor to include the token
    useEffect(() => {
        const interceptor = axios.interceptors.request.use(config => {
            const currentToken = tokenRef.current;
            if (currentToken) {
                config.headers.Authorization = `Bearer ${currentToken}`;
            } else {
                delete config.headers.Authorization;
            }
            return config;
        });

        return () => {
            axios.interceptors.request.eject(interceptor);
        }

    }, []);

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              setUser(firebaseUser);

              const shouldRefreshToken = !token || 
                (tokenExpiry && Date.now() >= tokenExpiry - 5 * 60 * 1000); // Refresh token 5 minutes before expiry


              if (shouldRefreshToken) {
                firebaseUser.getIdToken().then(idToken => {
                    setToken(idToken);
                    setTokenExpiry(Date.now() + 3600 * 1000); // 1 hour
                }).catch(error => {
                    console.error('Error refreshing token:', error);
                });

              }
              
              setLoading(false);
              setIsReady(true); // Set ready state when auth is done
              
              if(shouldRefreshToken) {
                firebaseUser.getIdToken().then(idToken => {
                    registerUserInBackend(firebaseUser, idToken).catch(error => {
                        console.error('Error registering user in backend:', error);
                    });
                }).catch(error => {
                    console.error('Error getting token:', error);
                });
              }
              
            } else {
                setUser(null);
                setToken(null);
                setTokenExpiry(null);
                setLoading(false);
                setIsReady(true);
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            setAuthError((error as Error).message);
            setLoading(false);
            setIsReady(true);
          }
        });
    
        return () => unsubscribe();
      }, [token, tokenExpiry]);


    
    const [isUserRegistered, setIsUserRegistered] = useState(false);
    
    const registerUserInBackend = async (firebaseUser: User, idToken: string) => {

        if (isUserRegistered) {
            return;
        }
        
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
            setIsUserRegistered(true);
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
            setLoading(false);
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

    // Update user's password
    const updatePassword = async (newPassword: string) => {
        try {
            setAuthError(null);
            setLoading(true);
            
            if (!user) {
                throw new Error('No user is currently signed in');
            }

            await firebaseUpdatePassword(user, newPassword);
        } catch (error: unknown) {
            setAuthError((error as Error).message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const value = useMemo(() => ({
        user,
        loading,
        authError,
        token,
        isReady,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        updatePassword
    }), [user, loading, authError, token, isReady]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}