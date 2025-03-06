'use client';

import React, {useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import Link from 'next/link';
import { Button } from 'primereact/button';

export default function Header() {
  const { user, loading } = useAuth();

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    if (localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);






  if (!user && !loading) {
    return null;
  }

  return (
    <div className="surface-0 py-3 px-4 md:px-6 shadow-2">
      <div className="hidden md:flex">
        <div className="grid w-full">
          <div className="col-4 flex justify-content-start">
          </div>
          
          <div className="col-4 flex justify-content-center">
            <Link href="/" className="no-underline">
              <span className="text-2xl font-bold text-white">KAIZEN</span>
            </Link>
          </div>
          
          <div className="col-4 flex justify-content-end">
            {!user && !loading && (
              <div className="flex align-items-center">
                <Link href="/auth/login">
                  <Button 
                    label="Login" 
                    className="p-button-text p-button-plain mr-2" 
                  />
                </Link>
                <Link href="/auth/register">
                  <Button 
                    label="Sign Up" 
                    className="p-button-primary" 
                  />
                </Link>
              </div>
            )}
            {user && !loading && (
              <div className="flex align-items-center">
                <Link href="/dashboard">
                  <Button 
                    label="Dashboard" 
                    className="p-button-text p-button-plain mr-2" 
                  />
                </Link>
                <Button 
                  icon="pi pi-user" 
                  className="p-button-rounded p-button-outlined" 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex md:hidden justify-content-between align-items-center">
        <Link href="/" className="no-underline">
          <span className="text-xl font-bold text-white">KAIZEN</span>
        </Link>
        {!user && !loading && (
          <div className="flex align-items-center">
            <Link href="/auth/login">
              <Button 
                icon="pi pi-user"
                className="p-button-text p-button-plain p-button-sm mr-1" 
              />
            </Link>
            <Link href="/auth/register">
              <Button 
                label="Sign Up" 
                className="p-button-primary p-button-sm" 
              />
            </Link>
          </div>
        )}
        {user && !loading && (
          <div className="flex align-items-center">
            <Link href="/dashboard">
              <Button 
                icon="pi pi-th-large"
                className="p-button-text p-button-plain p-button-sm mr-1" 
              />
            </Link>
            <Button 
              icon="pi pi-user" 
              className="p-button-rounded p-button-outlined p-button-sm" 
            />
          </div>
        )}
      </div>
    </div>
  );

}