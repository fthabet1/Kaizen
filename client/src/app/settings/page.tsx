/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import PasswordUpdate from '../../components/PasswordUpdate';

// PrimeReact Components
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Checkbox } from 'primereact/checkbox';
import { Message } from 'primereact/message';
import { TabView, TabPanel } from 'primereact/tabview';

interface UserSettings {
  theme: string;
  hour_format: string;
  week_start: number;
  notification_enabled: boolean;
}

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    hour_format: '24h',
    week_start: 1, // Monday
    notification_enabled: true,
  });
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });
  
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Fetch user settings
  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        try {
          setLoadingSettings(true);
          const [settingsResponse, profileResponse] = await Promise.all([
            axios.get('/api/users/settings'),
            axios.get('/api/users/profile')
          ]);
          
          if (settingsResponse.data) {
            setSettings(settingsResponse.data);
          }
          
          if (profileResponse.data) {
            setProfile({
              name: profileResponse.data.name || '',
              email: profileResponse.data.email || '',
            });
          }
        } catch (error) {
          console.error('Error fetching settings', error);
        } finally {
          setLoadingSettings(false);
        }
      };

      fetchSettings();
    }
  }, [user]);

  if (loading || loadingSettings) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <ProgressSpinner />
      </div>
    );
  }

  // Profile settings tab
  const ProfileSettings = () => (
    <div className="p-fluid">
      <div className="field mb-4">
        <label htmlFor="name" className="font-medium mb-2 block">Name</label>
        <InputText
          id="name"
          value={profile.name}
          disabled
          className="opacity-70"
        />
        <small className="text-color-secondary block mt-1">
          Profile information cannot be changed.
        </small>
      </div>
      
      <div className="field mb-4">
        <label htmlFor="email" className="font-medium mb-2 block">Email</label>
        <InputText
          id="email"
          value={profile.email}
          disabled
          className="opacity-70"
        />
        <small className="text-color-secondary block mt-1">
          Email cannot be changed. It is managed by your authentication provider.
        </small>
      </div>
    </div>
  );

  // Account settings tab
  const AccountSettings = () => {
    const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);

    return (
      <div>
        {!showPasswordUpdate ? (
          <>
            <p className="mb-4 line-height-3">
              Your account is managed through your authentication provider.
              You can update your password or sign out below.
            </p>
            
            <div className="flex flex-column gap-3">
              <Button 
                label="Update Password" 
                icon="pi pi-key" 
                className="p-button-outlined" 
                onClick={() => setShowPasswordUpdate(true)}
              />
              
              <Button 
                label="Sign Out" 
                icon="pi pi-sign-out" 
                className="p-button-outlined" 
                onClick={() => logout()}
              />
            </div>
          </>
        ) : (
          <div>
            <h3 className="text-xl font-medium mb-4">Update Password</h3>
            <PasswordUpdate 
              onSuccess={() => {
                setShowPasswordUpdate(false);
              }}
              onCancel={() => setShowPasswordUpdate(false)}
              showCancelButton={true}
            />
          </div>
        )}
      </div>
    );
  };

  // For mobile view, use tabview 
  const mobileView = () => {
    return (
      <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
        <TabPanel header="Profile">
          <ProfileSettings />
        </TabPanel>
        <TabPanel header="Account">
          <AccountSettings />
        </TabPanel>
      </TabView>
    );
  };

  // For desktop view, use grid layout
  const desktopView = () => {
    return (
      <div className="grid">
        <div className="col-12 md:col-6">
          <Card title="Profile" className="h-full">
            <ProfileSettings />
          </Card>
        </div>
        
        <div className="col-12 md:col-6">
          <Card title="Account" className="h-full">
            <AccountSettings />
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-4">
      <div className="mb-3 md:mb-4">
        <h1 className="text-2xl font-medium m-0">Settings</h1>
      </div>
      
      <div className="hidden md:block">
        {desktopView()}
      </div>
      
      <div className="block md:hidden">
        {mobileView()}
      </div>
    </div>
  );
}