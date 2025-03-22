/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from '../../utils/axiosConfig';
import { 
  format, parseISO, startOfWeek, endOfWeek 
} from 'date-fns';
import { formatTime } from '../../utils/timeUtils';
import { startServerAvailabilityCheck } from '../../utils/serverCheck';

import DailyActivityGraph from '../../components/dashboard/DailyActivityGraph';
import RecentActivityTable from '../../components/dashboard/RecentActivityTable';

import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { 
  PieChart, Pie, Cell, 
  ResponsiveContainer, 
  Tooltip, Legend 
} from 'recharts';

interface UserStats {
  totalTrackedTime: number;
  projectStats: ProjectStats[];
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
}

interface ProjectStats {
  id: number;
  name: string;
  color: string;
  totalTime: number;
  percentage: number;
}

interface DailyStats {
  date: string;
  totalTime: number;
}

interface WeeklyStats {
  weekStart: string;
  totalTime: number;
}

export default function Dashboard() {
  const { user, loading, isReady, token } = useAuth();
  const router = useRouter();
  const toast = useRef<Toast>(null);
  
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (isReady && !user) {
      router.push('/auth/login');
    }
  }, [user, isReady, router]);

  useEffect(() => {
    if (user && isReady) {
      fetchStats();
    }
  }, [user, isReady]);

  // Setup server availability check
  useEffect(() => {
    let stopServerCheck: (() => void) | null = null;
    
    const handleApiConnectionError = () => {
      console.log('Starting server availability check...');
      
      // Show a loading status toast
      toast.current?.show({
        severity: 'info',
        summary: 'Checking Connection',
        detail: 'Attempting to reconnect to the server...',
        life: 5000
      });
      
      // Start checking for server availability
      stopServerCheck = startServerAvailabilityCheck({
        onServerAvailable: () => {
          console.log('Server is available again, refreshing data...');
          toast.current?.show({
            severity: 'success',
            summary: 'Connected',
            detail: 'Server connection restored. Refreshing data...',
            life: 3000
          });
          
          // Reload data when server becomes available
          if (user && token && isReady) {
            fetchStats();
          }
        },
        maxRetries: 10 // Try 10 times (about 100 seconds)
      });
    };
    
    // Listen for API connection errors
    window.addEventListener('apiConnectionError', handleApiConnectionError as EventListener);
    
    return () => {
      window.removeEventListener('apiConnectionError', handleApiConnectionError as EventListener);
      if (stopServerCheck) stopServerCheck();
    };
  }, [user, token, isReady]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      // Ensure we have a token before making the request
      if (!token) {
        console.error('No authentication token available');
        toast.current?.show({ 
          severity: 'error', 
          summary: 'Authentication Error', 
          detail: 'Please log in again to access your dashboard', 
          life: 3000 
        });
        return;
      }
      
      console.log('Fetching dashboard stats from API...');
      
      const response = await axios.get('/api/stats', {
        timeout: 8000, // Longer timeout for stats which may take time to calculate
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        console.log('Stats fetched successfully');
        setStats(response.data);
      } else {
        console.error('Stats API returned empty response');
        toast.current?.show({ 
          severity: 'warn', 
          summary: 'No Data', 
          detail: 'No statistics available for your account yet', 
          life: 3000 
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      
      // Check if it's a network error
      if (axios.isAxiosError(error) && !error.response) {
        toast.current?.show({ 
          severity: 'error', 
          summary: 'Connection Error', 
          detail: 'Unable to connect to the server. Is the API running?', 
          life: 5000 
        });
      } else {
        toast.current?.show({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to fetch dashboard stats. Please try refreshing.', 
          life: 3000 
        });
      }
      
      // Set empty stats to prevent UI errors
      setStats({
        totalTrackedTime: 0,
        projectStats: [],
        dailyStats: [],
        weeklyStats: []
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const thisWeek = {
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d'),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')
  };

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-round shadow-2">
          <p className="font-medium mb-2">{payload[0].name}</p>
          <p>{formatTime(payload[0].value)}</p>
          <p className="text-color-secondary">{`${payload[0].payload.percentage.toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading || loadingStats) {
    return (
      <div className="flex justify-content-center align-items-center min-h-screen">
        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />
      
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid mb-4">
        <div className="col-12 md:col-4 p-2">
          <Card className="shadow-2 h-full">
            <div className="text-color-secondary mb-2">Total Time Tracked</div>
            <div className="text-3xl font-bold">
              {stats ? formatTime(stats.totalTrackedTime) : '0h 0m'}
            </div>
            <div className="text-sm text-color-secondary mt-1">All time</div>
          </Card>
        </div>
        
        <div className="col-12 md:col-4 p-2">
          <Card className="shadow-2 h-full">
            <div className="text-color-secondary mb-2">This Week</div>
            <div className="text-3xl font-bold">
              {stats && stats.weeklyStats && stats.weeklyStats.length > 0
                ? formatTime(stats.weeklyStats[stats.weeklyStats.length - 1].totalTime)
                : '0h 0m'}
            </div>
            <div className="text-sm text-color-secondary mt-1">{`${thisWeek.start} - ${thisWeek.end}`}</div>
          </Card>
        </div>
        
        <div className="col-12 md:col-4 p-2">
          <Card className="shadow-2 h-full">
            <div className="text-color-secondary mb-2">Projects</div>
            <div className="text-3xl font-bold">
              {stats && stats.projectStats ? stats.projectStats.length : 0}
            </div>
            <div className="text-sm text-color-secondary mt-1">Active</div>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid mb-4">
        {/* Activity Summary Chart */}
        <div className="col-12 lg:col-6">
          <DailyActivityGraph />
        </div>

        {/* Project Distribution Chart */}
        <div className="col-12 lg:col-6">
          <Card title="Project Distribution" className="h-full">
            <div className="h-20rem">
              {stats && stats.projectStats && stats.projectStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.projectStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="totalTime"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.projectStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={customTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex align-items-center justify-content-center h-full text-color-secondary">
                  No project data available
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-2">
        <h2 className="text-xl font-bold mb-3">Recent Activity</h2>
        <RecentActivityTable />
      </div>

    </div>
  );
}