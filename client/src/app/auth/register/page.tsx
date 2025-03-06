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

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { user, loading, signUpWithEmail, signInWithGoogle, authError } = useAuth();
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await signUpWithEmail(email, password, name);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create account');
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
            <div className="text-900 text-3xl font-medium mb-3">Create an Account</div>
            <span className="text-600 font-medium">Join Kaizen and boost your productivity</span>
            <div className="mt-2">
              <span className="text-600 line-height-3">Already have an account?</span>
              <Link href="/auth/login" className="font-medium no-underline ml-2 text-blue-500 cursor-pointer">
                Sign in
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
                  id="name" 
                  type="text" 
                  className="w-full" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

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
                  placeholder="Create a password"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4 w-full flex justify-content-center">
              <div className="w-10 md:w-8">
                <Password 
                  id="confirmPassword" 
                  className="w-full"
                  inputClassName="w-full"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  toggleMask 
                  placeholder="Confirm your password"
                  feedback={false}
                  required
                />
              </div>
            </div>

            <div className="w-10 md:w-8 mb-3">
              <Button 
                label="Create Account" 
                icon="pi pi-user-plus" 
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
                label="Sign up with Google" 
                icon="pi pi-google"
                className="w-full p-button-outlined" 
                onClick={handleGoogleSignIn}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}