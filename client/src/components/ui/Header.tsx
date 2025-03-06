'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { user, loading } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    if (localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setDarkMode(true);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/timer') return 'Timer';
    if (pathname.startsWith('/projects')) return 'Projects';
    if (pathname.startsWith('/tasks')) return 'Tasks';
    if (pathname.startsWith('/reports')) return 'Reports';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Productivity Tracker';
  };

  if (!user && !loading) {
    return null; // Don't show header when not logged in
  }

  return (
    <header className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-dark-primary">{getPageTitle()}</h1>
          <p className="text-sm text-gray-500 dark:text-dark-muted">
            {pathname.includes('dashboard') && 'Your productivity at a glance'}
            {pathname.includes('timer') && 'Track time for your tasks'}
            {pathname.includes('projects') && 'Manage your projects'}
            {pathname.includes('tasks') && 'Organize and track your tasks'}
            {pathname.includes('reports') && 'Analyze your productivity data'}
            {pathname.includes('settings') && 'Customize your preferences'}
          </p>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-md bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-hover transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* User profile menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                className="flex items-center text-sm focus:outline-none"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {user.email ? user.email.substring(0, 1).toUpperCase() : 'U'}
                </div>
                <svg
                  className="ml-1 h-5 w-5 text-gray-400 dark:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isProfileMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-dark-card ring-1 ring-black ring-opacity-5 dark:ring-opacity-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-primary">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-muted truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-hover"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <Link
                      href="/settings/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-hover"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <Link
                      href="/auth/login"
                      className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-hover"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Sign Out
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}