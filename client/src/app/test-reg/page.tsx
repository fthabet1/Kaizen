'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import axios from '../../utils/axiosConfig';

export default function TestRegistration() {
  const { user, token, loading } = useAuth();
  interface RegistrationResult {
    id: string;
    email: string;
    name: string;
    // Add other fields as necessary
  }

  const [manualRegistrationResult, setManualRegistrationResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to manually trigger user registration
  const triggerManualRegistration = async () => {
    if (!user || !token) {
      setError('No user or token available. Please log in first.');
      return;
    }

    try {
      setError(null);
      
      console.log('Starting manual registration...');
      console.log('User UID:', user.uid);
      console.log('Token available:', !!token);
      
      const response = await axios.post('/api/users/register', {
        auth_id: user.uid,
        email: user.email,
        name: user.displayName || 'Test User'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Registration response:', response.data);
      setManualRegistrationResult(response.data);
    } catch (err: unknown) {
      console.error('Manual registration error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Unknown error occurred');
      } else {
        setError('Unknown error occurred');
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Registration Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current User Status</h2>
        {loading ? (
          <p>Loading user information...</p>
        ) : user ? (
          <div>
            <p><strong>User ID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.displayName || 'Not set'}</p>
            <p><strong>Token Available:</strong> {token ? 'Yes' : 'No'}</p>
            {token && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-500">Show Token Preview</summary>
                <div className="mt-2 p-2 bg-gray-200 rounded overflow-hidden">
                  <code className="text-xs break-all">{token.substring(0, 50)}...</code>
                </div>
              </details>
            )}
          </div>
        ) : (
          <p className="text-red-500">Not logged in. Please log in first.</p>
        )}
      </div>
      
      <button
        onClick={triggerManualRegistration}
        disabled={!user || !token}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 mb-4"
      >
        Manually Trigger Database Registration
      </button>
      
      {error && (
        <div className="p-4 my-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {manualRegistrationResult && (
        <div className="p-4 my-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold mb-2">Registration Successful</h3>
          <div className=" p-3 rounded overflow-auto">
            <pre>{JSON.stringify(manualRegistrationResult, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}