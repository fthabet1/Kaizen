'use client';

import { ReactNode, useEffect, useState } from 'react';
import Header from './ui/Header';
import TimerBar from './timer/TimerBar';
import { useAuth } from '../contexts/AuthContexts';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-900 flex flex-column"></div>;
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