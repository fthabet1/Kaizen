import '../styles/globals.css';
import type { Metadata } from 'next';
import 'primereact/resources/themes/lara-dark-indigo/theme.css'; 
import 'primereact/resources/primereact.min.css';               // core css
import 'primeicons/primeicons.css';                             
import 'primeflex/primeflex.css';            
import { ReactNode } from 'react';
import { Providers } from './providers';
import Header from '../components/ui/Header';


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
          <div className="min-h-screen bg-gray-900 text-white flex flex-column overflow-hidden">
            <Header />
              {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}