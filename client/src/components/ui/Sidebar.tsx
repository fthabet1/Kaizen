/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContexts';
import { Button } from 'primereact/button';
import { Ripple } from 'primereact/ripple';
import { Divider } from 'primereact/divider';

interface SidebarProps {
  onClose?: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onClose, 
  collapsed, 
  onCollapseToggle
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null; // Don't show sidebar when not logged in
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'pi pi-home',
    },
    {
      name: 'Timer',
      href: '/timer',
      icon: 'pi pi-clock',
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: 'pi pi-briefcase',
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: 'pi pi-check-square',
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: 'pi pi-chart-bar',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: 'pi pi-cog',
    },
  ];

  const handleNavigation = useCallback(() => {
    console.log("Navigation item clicked, closing sidebar");
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleCloseSidebar = useCallback((e: React.MouseEvent) => {
    console.log("Close button clicked");
    
    e.preventDefault();
    
    e.stopPropagation();
    
    if (onClose) {
      console.log("Calling onClose function");
      onClose();
    } else {
      console.warn("onClose function is not defined");
    }
  }, [onClose]);

  return (
    <div
      className={`h-screen shadow-4 transition-all duration-500 ${
        collapsed ? 'w-5rem' : 'w-18rem'
      }`}
      style={{ 
        borderRadius: '0 8px 8px 0',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        zIndex: 10000
      }}
    >
      <div className="flex justify-content-end p-3 relative" style={{ zIndex: 10001 }}>
        <Button
          id="sidebar-close-btn"
          icon="pi pi-times"
          onClick={handleCloseSidebar}
          className="p-button size-small"
          rounded text
          style={{ 
            cursor: 'pointer',
          }}
          pt={{
            icon: { className: 'text-large' } 
          }}
          aria-label="Close sidebar"
        />
      </div>

      <div className="flex flex-column h-full p-3 pt-0">
        <Divider className={collapsed ? 'mx-2' : ''} />

        <div className="flex-1 overflow-y-auto">
          <ul className="list-none p-0 m-0">
            {navigation.map((item) => (
              <li key={item.name} className="mb-2">
                <Link 
                  href={item.href}
                  onClick={handleNavigation}
                  className="no-underline"
                >
                  <div
                    className={`p-ripple flex align-items-center cursor-pointer p-3 ${
                      pathname === item.href
                        ? 'bg-primary border-round text-white'
                        : 'text-color hover:surface-100 border-round'
                    } transition-colors transition-duration-150 ${
                      collapsed ? 'justify-content-center' : 'pl-3'
                    }`}
                  >
                    <i className={`${item.icon} ${collapsed ? 'text-xl' : 'mr-3'}`}></i>
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                    <Ripple />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Divider className={collapsed ? 'mx-2' : ''} />

        <div className="mt-auto mb-3">
          <Button
            onClick={() => {
              console.log("Logout button clicked");
              logout();
              if (onClose) {
                console.log("Closing sidebar after logout");
                onClose();
              }
            }}
            className={`p-button p-component p-button-outlined w-full ${
              collapsed ? 'p-button-icon-only' : ''
            }`}
            label={collapsed ? undefined : 'Logout'}
            icon="pi pi-power-off"
          />
        </div>

        <Button
          icon={collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'}
          onClick={onCollapseToggle}
          className="p-button-rounded p-button-text p-button-plain mx-auto mb-2"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        />
      </div>
    </div>
  );
};

export default Sidebar;