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
  const { user, loading, isReady } = useAuth();
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

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      const response = await axios.get('/api/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats', error);
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to fetch dashboard stats', 
        life: 3000 
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
        {/* Daily Activity Chart */}
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