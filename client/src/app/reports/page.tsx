'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  BarChart, Bar, LineChart, Line, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import { 
  format, parseISO, startOfWeek, endOfWeek, addDays,
  startOfMonth, endOfMonth, subMonths, subWeeks,
  startOfYear, endOfYear
} from 'date-fns';

interface UserStats {
  totalTrackedTime: number;
  projectStats: ProjectStats[];
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
}

interface ProjectStats {
  id: number;
  name: string;
  color: string;
  totalTime: number; // in seconds
  percentage: number;
}

interface DailyStats {
  date: string;
  totalTime: number; // in seconds
}

interface WeeklyStats {
  weekStart: string;
  totalTime: number; // in seconds
}

interface MonthlyStats {
  month: string;
  totalTime: number; // in seconds
}

interface TimeEntry {
  id: number;
  task_name: string;
  project_name: string;
  project_color: string;
  start_time: string;
  end_time: string;
  duration: number;
  description: string | null;
}

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState<string>('week');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: format(subWeeks(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Fetch reports data
  useEffect(() => {
    if (user) {
      fetchReportsData();
    }
  }, [user, dateRange, customDateRange]);

  const fetchReportsData = async () => {
    try {
      setLoadingData(true);
      
      // Calculate date range based on selection
      let startDate: Date;
      let endDate: Date = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case 'last_week':
          startDate = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          endDate = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          break;
        case 'last_month':
          startDate = startOfMonth(subMonths(new Date(), 1));
          endDate = endOfMonth(subMonths(new Date(), 1));
          break;
        case 'year':
          startDate = startOfYear(new Date());
          endDate = endOfYear(new Date());
          break;
        case 'all_time':
          startDate = new Date(0); // Beginning of time
          break;
        case 'custom':
          startDate = new Date(customDateRange.startDate);
          endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      }
      
      // Format dates for API
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const [statsResponse, entriesResponse] = await Promise.all([
        axios.get(`/api/stats?start_date=${formattedStartDate}&end_date=${formattedEndDate}`),
        axios.get(`/api/time-entries?start_date=${formattedStartDate}&end_date=${formattedEndDate}`)
      ]);
      
      setStats(statsResponse.data);
      setTimeEntries(entriesResponse.data);
    } catch (error) {
      console.error('Error fetching reports data', error);
    } finally {
      setLoadingData(false);
    }
  };

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

  // Format date range for display
  const getDateRangeText = () => {
    switch (dateRange) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'last_week':
        return 'Last Week';
      case 'last_month':
        return 'Last Month';
      case 'year':
        return 'This Year';
      case 'all_time':
        return 'All Time';
      case 'custom':
        return `${format(new Date(customDateRange.startDate), 'MMM d, yyyy')} to ${format(
          new Date(customDateRange.endDate),
          'MMM d, yyyy'
        )}`;
      default:
        return 'This Week';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold">Reports</h1>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="last_week">Last Week</option>
            <option value="last_month">Last Month</option>
            <option value="year">This Year</option>
            <option value="all_time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {dateRange === 'custom' && (
            <div className="flex space-x-2">
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) =>
                  setCustomDateRange({
                    ...customDateRange,
                    startDate: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="self-center">to</span>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) =>
                  setCustomDateRange({
                    ...customDateRange,
                    endDate: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="text-gray-500 mb-1">Report for</div>
        <div className="text-xl font-semibold">{getDateRangeText()}</div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-gray-500 mb-2">Total Time Tracked</div>
          <div className="text-3xl font-bold">
            {stats ? formatTime(stats.totalTrackedTime) : '0h 0m'}
          </div>
          <div className="text-sm text-gray-500 mt-1">{getDateRangeText()}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-gray-500 mb-2">Daily Average</div>
          <div className="text-3xl font-bold">
            {stats && stats.dailyStats && stats.dailyStats.length > 0
              ? formatTime(
                  stats.totalTrackedTime / stats.dailyStats.length
                )
              : '0h 0m'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Per day</div>
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
                  data={stats.dailyStats}
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

        {/* Weekly Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Weekly Trend</h2>
          <div className="h-64">
            {stats && stats.weeklyStats && stats.weeklyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.weeklyStats}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="weekStart" 
                    tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  />
                  <YAxis 
                    tickFormatter={(seconds) => `${Math.floor(seconds / 3600)}h`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), 'Time']}
                    labelFormatter={(date) => {
                      const startDate = parseISO(date as string);
                      const endDate = addDays(startDate, 6);
                      return `Week of ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
                    }}
                  />
                  <Area type="monotone" dataKey="totalTime" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No weekly data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Monthly Trend</h2>
          <div className="h-64">
            {stats && stats.monthlyStats && stats.monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.monthlyStats}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(date) => format(parseISO(date), 'MMM yyyy')}
                  />
                  <YAxis 
                    tickFormatter={(seconds) => `${Math.floor(seconds / 3600)}h`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), 'Time']}
                    labelFormatter={(date) => format(parseISO(date as string), 'MMMM yyyy')}
                  />
                  <Line type="monotone" dataKey="totalTime" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No monthly data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Breakdown Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Project Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          {stats && stats.projectStats && stats.projectStats.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.projectStats.map((project) => (
                  <tr key={project.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="flex-shrink-0 h-4 w-4 rounded-full"
                          style={{ backgroundColor: project.color }}
                        ></div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(project.totalTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full"
                            style={{
                              width: `${project.percentage}%`,
                              backgroundColor: project.color,
                            }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {project.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 px-6 text-gray-500">
              No project data available
            </div>
          )}
        </div>
      </div>

      {/* Time Entries List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Time Entries</h2>
        </div>
        <div className="overflow-x-auto">
          {timeEntries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Task
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell"
                  >
                    Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.task_name}
                      </div>
                      {entry.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="flex-shrink-0 h-3 w-3 rounded-full"
                          style={{ backgroundColor: entry.project_color }}
                        ></div>
                        <div className="ml-2 text-sm text-gray-900">
                          {entry.project_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {format(parseISO(entry.start_time), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                      {format(parseISO(entry.start_time), 'h:mm a')} - {entry.end_time ? format(parseISO(entry.end_time), 'h:mm a') : 'In Progress'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatTime(entry.duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 px-6 text-gray-500">
              No time entries found for the selected period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
