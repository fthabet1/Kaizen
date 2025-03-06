'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContexts';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}