'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface UserSettings {
  theme: string;
  hour_format: string;
  week_start: number;
  notification_enabled: boolean;
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
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

  if (loading || loadingSettings) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={profile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={true} // Email can't be changed in this version
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. It is managed by your authentication provider.
              </p>
            </div>
            
            {profileMessage && (
              <div className={`text-sm ${profileMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {profileMessage}
              </div>
            )}
            
            <div className="pt-2">
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">App Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
                Theme
              </label>
              <select
                id="theme"
                value={settings.theme}
                onChange={(e) => handleSettingsChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="hour-format" className="block text-sm font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                id="hour-format"
                value={settings.hour_format}
                onChange={(e) => handleSettingsChange('hour_format', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="week-start" className="block text-sm font-medium text-gray-700 mb-1">
                Week Starts On
              </label>
              <select
                id="week-start"
                value={settings.week_start}
                onChange={(e) => handleSettingsChange('week_start', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                id="notifications"
                type="checkbox"
                checked={settings.notification_enabled}
                onChange={(e) => handleSettingsChange('notification_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900">
                Enable notifications
              </label>
            </div>
            
            {settingsMessage && (
              <div className={`text-sm ${settingsMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {settingsMessage}
              </div>
            )}
            
            <div className="pt-2">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          
          <p className="text-gray-700 mb-4">
            Your account is managed through your authentication provider.
            To change your password or delete your account, please visit your provider&apos;s website.
          </p>
          
          <div className="pt-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Data</h2>
          
          <p className="text-gray-700 mb-4">
            You can export your time tracking data for backup or analysis.
          </p>
          
          <div className="space-y-2">
            <button
              onClick={() => alert('Feature coming soon!')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export as CSV
            </button>
            
            <button
              onClick={() => alert('Feature coming soon!')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export as JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
