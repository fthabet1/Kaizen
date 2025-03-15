'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContexts';
import { TimerProvider } from '../contexts/TimerContext';
import { PrimeReactProvider } from 'primereact/api';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrimeReactProvider value={{ ripple: true, ptOptions: { mergeProps: true } }}>
      <AuthProvider>
        <TimerProvider>
          {children}
        </TimerProvider>
      </AuthProvider>
    </PrimeReactProvider>
  );
}