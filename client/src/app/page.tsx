// client/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContexts';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';

export default function Home() {
  const { user, loading } = useAuth();
  const { loginWithRedirect } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">Productivity Tracker</div>
          {!user && !loading && (
            <div className="space-x-4">
              <Link 
                href="/auth/login" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Login
              </Link>
              <Link 
                href="/auth/register" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center max-w-6xl mx-auto">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                  Track Your Time, Boost Your Productivity
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Our productivity tracker helps you understand how you spend your time, 
                  enabling better work habits and improved efficiency.
                </p>
                <div className="space-x-4">
                  <button 
                    onClick={() => loginWithRedirect()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md"
                  >
                    Start Tracking Now
                  </button>
                  <Link 
                    href="#features" 
                    className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="bg-white p-6 rounded-lg shadow-xl">
                  <img 
                    src="/api/placeholder/600/400" 
                    alt="Dashboard Preview" 
                    className="rounded-md w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              Features That Drive Productivity
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Time Tracking</h3>
                <p className="text-gray-600">
                  Easily track time spent on projects and tasks with our intuitive timer interface.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Detailed Reports</h3>
                <p className="text-gray-600">
                  Visualize your productivity with comprehensive reports and analytics.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Project Management</h3>
                <p className="text-gray-600">
                  Organize your work by projects and tasks to stay focused on what matters.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">
              Ready to Boost Your Productivity?
            </h2>
            <button
              onClick={() => loginWithRedirect()}
              className="px-8 py-4 bg-blue-600 text-white rounded-md text-lg hover:bg-blue-700 shadow-md"
            >
              Get Started for Free
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold">Productivity Tracker</div>
              <div className="text-gray-400 mt-1">
                Track time, increase productivity
              </div>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">
                Terms
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                Privacy
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Productivity Tracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
