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
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Check localStorage for theme or use dark as default
              var theme = localStorage.theme || 'dark';
              document.documentElement.classList.add(theme);
              document.documentElement.style.backgroundColor = theme === 'dark' ? '#121212' : '#ffffff';
              document.documentElement.style.color = theme === 'dark' ? '#ffffff' : '#000000';
            })();
          `
        }} />
      </head>
      <body className="bg-gray-900 text-white">
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}