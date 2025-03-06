'use client';

import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContexts';
import { TimerProvider } from '../contexts/TimerContext';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import TimerBar from '../components/timer/TimerBar';
import { Auth0Provider } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // We need to handle Auth0 client-side only
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        {isMounted ? (
          <Auth0Provider
            domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || ''}
            clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || ''}
            authorizationParams={{
              redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
              audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
            }}
          >
            <AuthProvider>
              <TimerProvider>
                <div className="min-h-screen bg-gray-50 flex">
                  <Sidebar />
                  <div className="flex flex-col flex-1">
                    <Header />
                    <main className="flex-1 p-6 overflow-y-auto">
                      {children}
                    </main>
                    <TimerBar />
                  </div>
                </div>
              </TimerProvider>
            </AuthProvider>
          </Auth0Provider>
        ) : null}
      </body>
    </html>
  );
}
