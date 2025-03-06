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

// PrimeReact imports
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Timeline } from 'primereact/timeline';

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
    if (seconds === 0) return '0h 0m';
    
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
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d'),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')
  };

  // Timeline custom template
  const timelineTemplate = (item: RecentActivity) => {
    return (
      <div className="card mb-3">
        <div className="flex justify-content-between align-items-start p-3">
          <div>
            <span className="text-xl font-medium block mb-2">{item.task_name}</span>
            <div className="flex align-items-center mb-2">
              <div className="border-circle mr-2" style={{ backgroundColor: item.project_color, width: '0.75rem', height: '0.75rem' }}></div>
              <span className="text-color-secondary">{item.project_name}</span>
            </div>
            {item.description && (
              <p className="text-color-secondary m-0">{item.description}</p>
            )}
          </div>
          <div className="flex flex-column align-items-end">
            <span className="font-medium mb-1">{formatTime(item.duration)}</span>
            <span className="text-sm text-color-secondary">{formatDate(item.start_time, true)}</span>
          </div>
        </div>
      </div>
    );
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
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Overview Stats */}
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
        <div className="col-12 lg:col-6 p-2">
          <Card title="Daily Activity" className="shadow-2 h-full">
            <div className="h-20rem">
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
                    <Bar dataKey="totalTime" fill="var(--primary-color)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex align-items-center justify-content-center h-full text-color-secondary">
                  No daily activity data available
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Project Distribution Chart */}
        <div className="col-12 lg:col-6 p-2">
          <Card title="Project Distribution" className="shadow-2 h-full">
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
                    <Tooltip 
                      formatter={(value: number) => [formatTime(value), 'Time']}
                    />
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
        <Card title="Recent Activity" className="shadow-2">
          {recentActivity && recentActivity.length > 0 ? (
            <Timeline 
              value={recentActivity} 
              content={timelineTemplate}
              className="customized-timeline"
            />
          ) : (
            <div className="p-4 text-center text-color-secondary">
              No recent activity found. Start tracking to see your activity here.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}