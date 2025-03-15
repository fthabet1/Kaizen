'use client';

import { ReactNode, useEffect, useState } from 'react';
import Header from './ui/Header';
import TimerBar from './timer/TimerBar';
import { useAuth } from '../contexts/AuthContexts';
import { ProgressSpinner } from 'primereact/progressspinner';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-column justify-content-center align-items-center">
        <div className="text-white mb-4">Loading Kaizen...</div>
        <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="4" animationDuration=".5s" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-column overflow-hidden">
      <Header />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
      {user && <TimerBar />}
    </div>
  );
}