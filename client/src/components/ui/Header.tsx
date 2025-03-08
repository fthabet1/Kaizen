'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const userMenuRef = useRef<Menu>(null);
  const [userMenuItems, setUserMenuItems] = useState<MenuItem[]>([]);
  
  // State for sidebar
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    if (localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Setup menu items when user is available
  useEffect(() => {
    if (user) {
      setUserMenuItems([
        {
          label: user.email || 'User',
          className: 'font-bold text-sm p-2 border-bottom-1 border-gray-200',
          disabled: true
        },
        {
          label: 'Settings',
          icon: 'pi pi-cog',
          command: () => router.push('/settings')
        },
        {
          separator: true
        },
        {
          label: 'Logout',
          icon: 'pi pi-power-off',
          command: async () => {
            try {
              await logout();
              router.push('/');
            } catch (error) {
              console.error('Logout failed', error);
            }
          }
        }
      ]);
    }
  }, [user, logout, router]);

  if (!user && !loading) {
    return null;
  }

  const toggleUserMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (userMenuRef.current) {
      userMenuRef.current.toggle(event);
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const toggleCollapsedState = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      <div className={`fixed inset-0 z-10 pointer-events-none ${!user || !sidebarVisible ? 'hidden' : ''}`}>
        <div 
          className={`absolute inset-y-0 left-0 transition-transform duration-500 ease-in-out transform ${
            sidebarVisible ? 'translate-x-0' : '-translate-x-full'
          } pointer-events-auto`}
        >
          <Sidebar 
            onClose={toggleSidebar}
            collapsed={collapsed}
            onCollapseToggle={toggleCollapsedState}
          />
        </div>
        {sidebarVisible && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto"
            onClick={toggleSidebar}
            style={{ left: collapsed ? '5rem' : '18rem' }}
          ></div>
        )}
      </div>
    
      <div className="surface-card py-3 px-4 md:px-6 shadow-2 relative z-5">
        <div className="hidden md:flex">
          <div className="grid w-full">
            <div className="col-4 flex justify-content-start">
              {user && !sidebarVisible && (
                <Button
                  icon="pi pi-bars"
                  className="p-button-rounded p-button-text"
                  onClick={toggleSidebar}
                  aria-label="Toggle sidebar"
                />
              )}
            </div>
            
            <div className="col-4 flex justify-content-center">
              <Link href="/" className="no-underline">
                <span className="text-2xl font-bold text-white">KAIZEN</span>
              </Link>
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
            {user && !loading && (
              <div className="flex align-items-center">
                <Button 
                  icon="pi pi-user" 
                  className="p-button-rounded p-button-outlined" 
                  onClick={toggleUserMenu}
                  aria-controls="user-menu" 
                  aria-haspopup
                />
                <Menu 
                  model={userMenuItems} 
                  popup 
                  ref={userMenuRef} 
                  id="user-menu" 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex md:hidden justify-content-between align-items-center">
        {user && !sidebarVisible && (
          <Button
            icon="pi pi-bars"
            className="p-button-rounded p-button-text p-button-sm mr-2"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          />
        )}
        <Link href="/" className="no-underline">
          <span className="text-xl font-bold text-white">KAIZEN</span>
        </Link>
        {!user && !loading && (
          <div className="flex align-items-center">
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
        {user && !loading && (
          <div className="flex align-items-center">
            <Button 
              icon="pi pi-user" 
              className="p-button-rounded p-button-outlined p-button-sm"
              onClick={toggleUserMenu}
              aria-controls="user-menu-mobile" 
              aria-haspopup
            />
            <Menu 
              model={userMenuItems} 
              popup 
              ref={userMenuRef} 
              id="user-menu-mobile" 
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}