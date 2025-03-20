'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContexts';
import Link from 'next/link';

// PrimeReact imports
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [year, setYear] = useState('2024');

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-column overflow-hidden">
      <div className="surface-0 py-3 px-4 md:px-6 shadow-2">
        <div className="hidden md:flex">
          <div className="grid w-full">
            <div className="col-4 flex justify-content-start">
            </div>
            
            <div className="col-4 flex justify-content-center">
              <span className="text-4xl font-bold text-white mt-2">KAIZEN</span>
            </div>
            
            <div className="col-4 flex justify-content-end">
              {!user && !loading && (
                <div className="flex align-items-center">
                  <Link href="/auth/login">
                    <Button 
                      label="Login" 
                      className="p-button-text p-button-plain mr-2" 
                    />
                  </Link>
                  <Link href="/auth/register">
                    <Button 
                      label="Sign Up" 
                      className="p-button-primary" 
                    />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex md:hidden justify-content-between align-items-center">
          <span className="text-xl font-bold text-white">KAIZEN</span>
          {!user && !loading && (
            <div className=" align-items-center">
              <Link href="/auth/login">
                <Button 
                  icon="pi pi-user"
                  className="p-button-text p-button-plain p-button-sm mr-1" 
                />
              </Link>
              <Link href="/auth/register">
                <Button 
                  label="Sign Up" 
                  className="p-button-primary p-button-sm" 
                />
              </Link>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <Divider className="border-gray-800" />
        <section className="pb-4 md:pb-8">
          <div className="px-4 md:px-6">
            <div className="grid">
              <div className="col-12">
                <h3 className="uppercase text-sm font-medium text-gray-400 mb-3 text-center">Where productivity begins</h3>
              </div>
              
              <div className="col-12 md:col-4 p-2 md:p-4">
                <Card className="bg-gray-800 border-none shadow-none">
                  <div className="flex flex-column align-items-center">
                    <div className="bg-blue-900 border-circle w-3rem h-3rem flex align-items-center justify-content-center mb-3">
                      <i className="pi pi-clock text-blue-300 text-xl"></i>
                    </div>
                    <span className="text-base text-center">Time Tracking</span>
                  </div>
                </Card>
              </div>
              
              <div className="col-12 md:col-4 p-2 md:p-4">
                <Card className="bg-gray-800 border-none shadow-none">
                  <div className="flex flex-column align-items-center">
                    <div className="bg-blue-900 border-circle w-3rem h-3rem flex align-items-center justify-content-center mb-3">
                      <i className="pi pi-chart-bar text-blue-300 text-xl"></i>
                    </div>
                    <span className="text-base text-center">Detailed Reports</span>
                  </div>
                </Card>
              </div>
              
              <div className="col-12 md:col-4 p-2 md:p-4">
                <Card className="bg-gray-800 border-none shadow-none">
                  <div className="flex flex-column align-items-center">
                    <div className="bg-blue-900 border-circle w-3rem h-3rem flex align-items-center justify-content-center mb-3">
                      <i className="pi pi-folder text-blue-300 text-xl"></i>
                    </div>
                    <span className="text-base text-center">Project Management</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-3 md:py-4 mt-auto">
        <div className="px-4 md:px-6">
          <div className="grid">
            <div className="col-12 md:col-6 flex align-items-center justify-content-center md:justify-content-start">
              <div className="text-center md:text-left">
                <div className="text-xl font-bold">Kaizen</div>
                <div className="text-gray-400 text-sm mt-1">
                  Track time, increase productivity
                </div>
              </div>
            </div>
            <div className="col-12 md:col-6 flex align-items-center justify-content-center md:justify-content-end mt-3 md:mt-0">
              <div className="flex gap-2 md:gap-4 flex-wrap justify-content-center md:justify-content-end">
                <Link href="/terms">
                  <Button label="Terms" className="p-button-text p-button-plain p-button-sm" />
                </Link>
                <Link href="/privacy">
                  <Button label="Privacy" className="p-button-text p-button-plain p-button-sm" />
                </Link>
                <Link href="/contact">
                  <Button label="Contact" className="p-button-text p-button-plain p-button-sm" />
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-2 md:mt-4 mb-0 text-center text-gray-500 text-xs">
            &copy; {year} Kaizen. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}