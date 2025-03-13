import '../styles/globals.css';
import type { Metadata } from 'next';
import 'primereact/resources/themes/lara-dark-indigo/theme.css'; 
import 'primereact/resources/primereact.min.css';        
import 'primeicons/primeicons.css';                             
import 'primeflex/primeflex.css';            
import { ReactNode } from 'react';
import { Providers } from './providers';
import MainLayout from '../components/MainLayout';

export const metadata: Metadata = {
  title: 'Kaizen | Productivity Suite',
  description: 'Track your time, boost your productivity',
  keywords: 'productivity, time management, productivity tracker'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}