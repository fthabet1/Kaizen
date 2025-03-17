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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {isMounted ? (
        <AuthProvider>
          <TimerProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Header />
              <main className="flex-1 p-6 overflow-y-auto mb-16"> {/* Add margin-bottom to ensure content isn't hidden by timer bar */}
                {children}
              </main>
              <TimerBar />
            </div>
          </TimerProvider>
        </AuthProvider>
      ) : null}
    </>
  );
}