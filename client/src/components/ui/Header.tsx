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
  
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

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

  useEffect(() => {
    setSidebarVisible(false);
  }, []);
  
  useEffect(() => {
    const handleRouteChange = () => {
      setSidebarVisible(false);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  if (!user && !loading) {
    return null;
  }

  const toggleUserMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (userMenuRef.current) {
      userMenuRef.current.toggle(event);
    }
  };

  const openSidebar = () => {
    console.log("Opening sidebar");
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    console.log("Closing sidebar");
    setSidebarVisible(false);
  };

  const toggleCollapsedState = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {user && (
        <div className="sidebar-container" style={{ zIndex: 9999 }}>
          {sidebarVisible && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={closeSidebar}
              style={{ 
                left: collapsed ? '5rem' : '18rem',
                zIndex: 9998
              }}
            ></div>
          )}
          
          <div 
            className={`fixed inset-y-0 left-0 transform ${
              sidebarVisible ? 'translate-x-0' : '-translate-x-full'
            } transition-transform duration-300 ease-in-out`}
            style={{ zIndex: 9999 }}
          >
            {sidebarVisible && (
              <Sidebar 
                onClose={closeSidebar}
                collapsed={collapsed}
                onCollapseToggle={toggleCollapsedState}
              />
            )}
          </div>
        </div>
      )}
    
      {/* Header content */}
      <div className="surface-card py-3 px-4 md:px-6 shadow-2 relative" style={{ zIndex: 10 }}>
        <div className="hidden md:flex">
          <div className="grid w-full">
            <div className="col-4 flex justify-content-start">
              {user && (
                <Button
                  icon="pi pi-bars"
                  className="p-button-rounded p-button-text"
                  onClick={openSidebar}
                  aria-label="Open sidebar"
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
        {user && (
          <Button
            icon="pi pi-bars"
            className="p-button-rounded p-button-text p-button-sm mr-2"
            onClick={openSidebar}
            aria-label="Open sidebar"
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