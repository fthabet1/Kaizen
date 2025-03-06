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

// PrimeReact imports
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressSpinner } from 'primereact/progressspinner';

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

interface DateRangeOption {
  label: string;
  value: string;
}

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState<string>('week');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(subWeeks(new Date(), 1)),
    endDate: new Date(),
  });

  const dateRangeOptions: DateRangeOption[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Week', value: 'last_week' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all_time' },
    { label: 'Custom Range', value: 'custom' }
  ];

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
          startDate = customDateRange.startDate;
          endDate = customDateRange.endDate;
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
        return `${format(customDateRange.startDate, 'MMM d, yyyy')} to ${format(
          customDateRange.endDate, 'MMM d, yyyy'
        )}`;
      default:
        return 'This Week';
    }
  };

  // DataTable templates for project table
  const projectColorTemplate = (rowData: ProjectStats) => {
    return (
      <div className="flex align-items-center">
        <div className="flex-shrink-0 border-circle mr-2" style={{ backgroundColor: rowData.color, width: '1rem', height: '1rem' }}></div>
        <span>{rowData.name}</span>
      </div>
    );
  };

  const percentageTemplate = (rowData: ProjectStats) => {
    return (
      <div className="flex align-items-center">
        <div className="w-full bg-gray-200 border-round h-8px mr-2">
          <div className="h-8px border-round" style={{ width: `${rowData.percentage}%`, backgroundColor: rowData.color }}></div>
        </div>
        <span>{rowData.percentage.toFixed(1)}%</span>
      </div>
    );
  };

  // DataTable templates for time entries table
  const taskTemplate = (rowData: TimeEntry) => {
    return (
      <div>
        <div className="font-medium">{rowData.task_name}</div>
        {rowData.description && <div className="text-sm text-color-secondary mt-1">{rowData.description}</div>}
      </div>
    );
  };

  const projectTemplate = (rowData: TimeEntry) => {
    return (
      <div className="flex align-items-center">
        <div className="flex-shrink-0 border-circle mr-2" style={{ backgroundColor: rowData.project_color, width: '0.75rem', height: '0.75rem' }}></div>
        <span>{rowData.project_name}</span>
      </div>
    );
  };

  const dateTemplate = (rowData: TimeEntry) => {
    return format(parseISO(rowData.start_time), 'MMM d, yyyy');
  };

  const timeTemplate = (rowData: TimeEntry) => {
    return `${format(parseISO(rowData.start_time), 'h:mm a')} - ${rowData.end_time ? format(parseISO(rowData.end_time), 'h:mm a') : 'In Progress'}`;
  };

  const durationTemplate = (rowData: TimeEntry) => {
    return formatTime(rowData.duration);
  };

  if (loading || loadingData) {
    return (
      <div className="flex justify-content-center align-items-center min-h-screen">
        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold m-0">Reports</h1>
        
        <div className="flex flex-column sm:flex-row gap-2">
          <Dropdown
            value={dateRange}
            options={dateRangeOptions}
            onChange={(e) => setDateRange(e.value)}
            placeholder="Select Date Range"
            className="w-full sm:w-12rem"
          />
          
          {dateRange === 'custom' && (
            <div className="flex gap-2 align-items-center">
              <Calendar
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.value as Date })}
                showIcon
                dateFormat="MM/dd/yy"
                className="w-full"
              />
              <span className="text-color-secondary font-medium">to</span>
              <Calendar
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.value as Date })}
                showIcon
                dateFormat="MM/dd/yy"
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <div className="text-color-secondary mb-1">Report for</div>
        <div className="text-xl font-medium">{getDateRangeText()}</div>
      </Card>

      {/* Overview Stats */}
      <div className="grid mb-4">
        <div className="col-12 md:col-4">
          <Card className="h-full">
            <div className="text-color-secondary mb-2">Total Time Tracked</div>
            <div className="text-3xl font-bold">
              {stats ? formatTime(stats.totalTrackedTime) : '0h 0m'}
            </div>
            <div className="text-sm text-color-secondary mt-1">{getDateRangeText()}</div>
          </Card>
        </div>
        
        <div className="col-12 md:col-4">
          <Card className="h-full">
            <div className="text-color-secondary mb-2">Daily Average</div>
            <div className="text-3xl font-bold">
              {stats && stats.dailyStats && stats.dailyStats.length > 0
                ? formatTime(
                    stats.totalTrackedTime / stats.dailyStats.length
                  )
                : '0h 0m'}
            </div>
            <div className="text-sm text-color-secondary mt-1">Per day</div>
          </Card>
        </div>
        
        <div className="col-12 md:col-4">
          <Card className="h-full">
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
          <Card title="Daily Activity" className="h-full">
            <div className="h-20rem">
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

        {/* Weekly Trend Chart */}
        <div className="col-12 lg:col-6">
          <Card title="Weekly Trend" className="h-full">
            <div className="h-20rem">
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
                <div className="flex align-items-center justify-content-center h-full text-color-secondary">
                  No weekly data available
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <div className="col-12 lg:col-6">
          <Card title="Monthly Trend" className="h-full">
            <div className="h-20rem">
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
                <div className="flex align-items-center justify-content-center h-full text-color-secondary">
                  No monthly data available
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Project Breakdown Table */}
      <Card title="Project Breakdown" className="mb-4">
        {stats && stats.projectStats && stats.projectStats.length > 0 ? (
          <DataTable
            value={stats.projectStats}
            responsiveLayout="scroll"
            className="p-datatable-sm"
            emptyMessage="No project data available"
          >
            <Column field="name" header="Project" body={projectColorTemplate} />
            <Column field="totalTime" header="Time" body={(rowData) => formatTime(rowData.totalTime)} />
            <Column field="percentage" header="Percentage" body={percentageTemplate} />
          </DataTable>
        ) : (
          <div className="text-center py-4 text-color-secondary">
            No project data available
          </div>
        )}
      </Card>

      {/* Time Entries Table */}
      <Card title="Time Entries">
        <DataTable
          value={timeEntries}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage="No time entries found for the selected period"
          responsiveLayout="stack"
          breakpoint="960px"
          className="p-datatable-sm"
        >
          <Column field="task_name" header="Task" body={taskTemplate} />
          <Column field="project_name" header="Project" body={projectTemplate} />
          <Column field="start_time" header="Date" body={dateTemplate} className="hidden md:table-cell" />
          <Column field="time" header="Time" body={timeTemplate} className="hidden sm:table-cell" />
          <Column field="duration" header="Duration" body={durationTemplate} />
        </DataTable>
      </Card>
    </div>
  );
}