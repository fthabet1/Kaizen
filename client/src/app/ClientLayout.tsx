'use client';

import { useEffect, useState } from 'react';
import { AuthProvider } from '../contexts/AuthContexts';
import { TimerProvider } from '../contexts/TimerContext';
import Header from '../components/ui/Header';
import TimerBar from '../components/timer/TimerBar';



export default function ClientLayout({
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
    <>
      {isMounted ? (
          <AuthProvider>
            <TimerProvider>
              <div className="min-h-screen bg-gray-50 flex">
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
      ) : null}
    </>
  );
}