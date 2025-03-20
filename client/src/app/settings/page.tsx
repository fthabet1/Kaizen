/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';

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
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
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

  const handleSettingsChange = (key: keyof UserSettings, value: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProfileChange = (key: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMessage('');
      
      await axios.put('/api/users/settings', settings);
      
      setSettingsMessage('Settings saved successfully');
      
      // Apply theme immediately
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(settings.theme);
    } catch (error) {
      console.error('Error saving settings', error);
      setSettingsMessage('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileMessage('');
      
      await axios.put('/api/users/profile', profile);
      
      setProfileMessage('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile', error);
      setProfileMessage('Error saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Options for dropdowns
  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' }
  ];

  const hourFormatOptions = [
    { label: '12-hour (AM/PM)', value: '12h' },
    { label: '24-hour', value: '24h' }
  ];

  const weekStartOptions = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 }
  ];

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
          onChange={(e) => handleProfileChange('name', e.target.value)}
        />
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
      
      {profileMessage && (
        <Message 
          severity={profileMessage.includes('Error') ? 'error' : 'success'} 
          text={profileMessage}
          className="w-full mb-4"
        />
      )}
      
      <Button 
        label="Save Profile" 
        icon="pi pi-save" 
        onClick={saveProfile}
        loading={savingProfile}
      />
    </div>
  );

  // App settings tab
  const AppSettings = () => (
    <div className="p-fluid">
      <div className="field mb-4">
        <label htmlFor="theme" className="font-medium mb-2 block">Theme</label>
        <Dropdown
          id="theme"
          value={settings.theme}
          options={themeOptions}
          onChange={(e) => handleSettingsChange('theme', e.value)}
          className="w-full"
        />
      </div>
      
      <div className="field-checkbox mb-4">
        <Checkbox
          inputId="notifications"
          checked={settings.notification_enabled}
          onChange={(e) => handleSettingsChange('notification_enabled', e.checked!)}
        />
        <label htmlFor="notifications" className="ml-2">Enable notifications</label>
      </div>
      
      {settingsMessage && (
        <Message 
          severity={settingsMessage.includes('Error') ? 'error' : 'success'} 
          text={settingsMessage}
          className="w-full mb-4"
        />
      )}
      
      <Button 
        label="Save Settings" 
        icon="pi pi-save" 
        onClick={saveSettings}
        loading={savingSettings}
      />
    </div>
  );

  // Account settings tab
  const AccountSettings = () => (
    <div>
      <p className="mb-4 line-height-3">
        Your account is managed through your authentication provider.
        To change your password or delete your account, please visit your provider&apos;s website.
      </p>
      
      <Button 
        label="Sign Out" 
        icon="pi pi-sign-out" 
        className="p-button-outlined" 
        onClick={() => logout()}
      />
    </div>
  );

  // Data export tab
  const DataExport = () => (
    <div>
      <p className="mb-4 line-height-3">
        You can export your time tracking data for backup or analysis.
      </p>
      
      <div className="flex flex-column gap-2">
        <Button 
          label="Export as CSV" 
          icon="pi pi-file" 
          className="p-button-outlined"
          onClick={() => alert('Feature coming soon!')}
        />
        
        <Button 
          label="Export as JSON" 
          icon="pi pi-file" 
          className="p-button-outlined"
          onClick={() => alert('Feature coming soon!')}
        />
      </div>
    </div>
  );

  // For mobile view, use tabview 
  const mobileView = () => {
    return (
      <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
        <TabPanel header="Profile">
          <ProfileSettings />
        </TabPanel>
        <TabPanel header="App Settings">
          <AppSettings />
        </TabPanel>
        <TabPanel header="Account">
          <AccountSettings />
        </TabPanel>
        <TabPanel header="Data">
          <DataExport />
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
          <Card title="App Settings" className="h-full">
            <AppSettings />
          </Card>
        </div>
        
        <div className="col-12 md:col-6">
          <Card title="Account" className="h-full">
            <AccountSettings />
          </Card>
        </div>
        
        <div className="col-12 md:col-6">
          <Card title="Data" className="h-full">
            <DataExport />
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