'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContexts';

// PrimeReact imports
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { Dialog } from 'primereact/dialog';
import PasswordUpdate from '../../../components/PasswordUpdate';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const { user, loading, signInWithEmail, signInWithGoogle, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to sign in');
      } else {
        setError('Failed to sign in');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to sign in with Google');
      } else {
        setError('Failed to sign in with Google');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center min-h-screen">
        <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '2rem' }}></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-content-center align-items-center bg-gray-900">
      <div className="p-4 w-full md:w-8 lg:w-6 xl:w-4">
        <Card className="shadow-5">
          <div className="text-center mb-5">
            <div className="text-900 text-3xl font-medium mb-3">Welcome to Kaizen</div>
            <span className="text-600 font-medium">Sign in to continue</span>
            <div className="mt-2">
              <span className="text-600 line-height-3">Don&apos;t have an account?</span>
              <Link href="/auth/register" className="font-medium no-underline ml-2 text-blue-500 cursor-pointer">
                Create one
              </Link>
            </div>
          </div>

          {error && (
            <Message severity="error" text={error} className="w-full mb-4" />
          )}

            <form onSubmit={handleSubmit} className="flex flex-column align-items-center">
            <div className="mb-4 w-full flex justify-content-center">
              <div className="w-10 md:w-8">
              <InputText 
                id="email" 
                type="email" 
                className="w-full" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Email address"
                required
              />
              </div>
            </div>

            <div className="mb-4 w-full flex justify-content-center">
              <div className="w-10 md:w-8">
              <Password 
                id="password" 
                className="w-full"
                inputClassName="w-full"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                toggleMask 
                placeholder="Password"
                feedback={false}
                required
                style={{ width: '100%' }}
              />
              </div>
            </div>
            
            <div className="flex justify-content-center mb-4 w-10 md:w-8">
              <Link 
                href="#" 
                className="font-medium no-underline text-blue-500 cursor-pointer ml-auto"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPasswordUpdate(true);
                }}
              >
                Forgot password?
              </Link>
            </div>

            <div className="w-10 md:w-8 mb-3">
              <Button 
                label="Sign In" 
                icon="pi pi-user" 
                className="w-full p-button-primary" 
                type="submit"
              />
            </div>
          </form>

          <Divider align="center">
            <span className="text-600 font-normal">or</span>
          </Divider>
          
          <div className="flex justify-content-center">
            <div className="w-10 md:w-8">
              <Button 
                label="Sign in with Google" 
                icon="pi pi-google"
                className="w-full p-button-outlined" 
                onClick={handleGoogleSignIn}
              />
            </div>
          </div>
        </Card>
      </div>

      <Dialog 
        visible={showPasswordUpdate} 
        onHide={() => setShowPasswordUpdate(false)}
        header="Update Password"
        className="p-fluid"
        style={{ width: '90%', maxWidth: '500px' }}
      >
        <PasswordUpdate 
          onSuccess={() => {
            setShowPasswordUpdate(false);
          }}
          onCancel={() => setShowPasswordUpdate(false)}
          showCancelButton={true}
        />
      </Dialog>
    </div>
  );
}