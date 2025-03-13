'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContexts';
import { TimerProvider } from '../contexts/TimerContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TimerProvider>
        {children}
      </TimerProvider>
    </AuthProvider>
  );
}