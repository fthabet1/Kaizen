// client/src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

// Define types for our stats
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

interface RecentActivity {
  id: number;
  task_name: string;
  project_name: string;
  project_color: string;
  start_time: string;
  end_time: string;
  duration: number;
  description: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const fetchStats = async () => {
        try {
          setLoadingStats(true);
          const [statsResponse, activityResponse] = await Promise.all([
            axios.get('/api/stats'),
            axios.get('/api/time-entries/recent')
          ]);
          
          setStats(statsResponse.data);
          setRecentActivity(activityResponse.data);
        } catch (error) {
          console.error('Error fetching stats', error);
        } finally {
          setLoadingStats(false);
        }
      };

      fetchStats();
    }
  }, [user]);

  // Format time from seconds to readable format
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format date for display
  const formatDate = (dateString: string, includeTime = false) => {
    return format(parseISO(dateString), includeTime ? 'MMM d, h:mm a' : 'MMM d, yyyy');
  };
  // Get date range for this week
  const thisWeek = {
    start: format(startOfWeek(new Date()), 'MMM d'),
    end: format(endOfWeek(new Date()), 'MMM d')
  };

  if (loading || loadingStats) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-gray-500 mb-2">Total Time Tracked</div>
          <div className="text-3xl font-bold">
            {stats ? formatTime(stats.totalTrackedTime) : '0h 0m'}
          </div>
          <div className="text-sm text-gray-500 mt-1">All time</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-gray-500 mb-2">This Week</div>
          <div className="text-3xl font-bold">
            {stats && stats.weeklyStats && stats.weeklyStats.length > 0
              ? formatTime(stats.weeklyStats[stats.weeklyStats.length - 1].totalTime)
              : '0h 0m'}
          </div>
          <div className="text-sm text-gray-500 mt-1">{`${thisWeek.start} - ${thisWeek.end}`}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-gray-500 mb-2">Projects</div>
          <div className="text-3xl font-bold">
            {stats && stats.projectStats ? stats.projectStats.length : 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Active</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Daily Activity</h2>
          <div className="h-64">
            {stats && stats.dailyStats && stats.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.dailyStats.slice(-7)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  />
                  <YAxis 
                    tickFormatter={(seconds) => `${Math.floor(seconds / 3600)}h`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), 'Time']}
                    labelFormatter={(date) => format(parseISO(date as string), 'MMMM d, yyyy')}
                  />
                  <Bar dataKey="totalTime" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No daily activity data available
              </div>
            )}
          </div>
        </div>

        {/* Project Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Project Distribution</h2>
          <div className="h-64">
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
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), 'Time']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No project data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{activity.task_name}</div>
                    <div className="flex items-center mt-1">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: activity.project_color }}
                      />
                      <span className="text-sm text-gray-500">{activity.project_name}</span>
                    </div>
                    {activity.description && (
                      <div className="text-sm text-gray-500 mt-1">{activity.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatTime(activity.duration)}</div>
                    <div className="text-sm text-gray-500">
                        {formatDate(activity.start_time, true)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent activity found. Start tracking to see your activity here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
