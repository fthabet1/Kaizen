/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
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
import { formatDateForDisplay, parseISOWithTimezone } from '../../utils/dateUtils';

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
  end_time: string | null;  // Make end_time nullable to match actual data
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
    { label: 'Past 7 Days', value: 'past_7_days' },
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

  const prepareStatsData = (rawStats: UserStats | null) => {
    if (!rawStats) return null;
    
    // Make a deep copy to avoid mutation issues
    const processedStats = {...rawStats};
    
    // Ensure totalTrackedTime has a value
    processedStats.totalTrackedTime = processedStats.totalTrackedTime || 0;
    
    // Ensure all arrays exist at minimum as empty arrays
    processedStats.projectStats = Array.isArray(processedStats.projectStats) ? processedStats.projectStats : [];
    processedStats.dailyStats = Array.isArray(processedStats.dailyStats) ? processedStats.dailyStats : [];
    processedStats.weeklyStats = Array.isArray(processedStats.weeklyStats) ? processedStats.weeklyStats : [];
    processedStats.monthlyStats = Array.isArray(processedStats.monthlyStats) ? processedStats.monthlyStats : [];
    
    // Validate date formats and ensure data is not corrupted
    if (processedStats.dailyStats.length > 0) {
      processedStats.dailyStats = processedStats.dailyStats
        .filter(item => item && item.date && !isNaN(new Date(item.date).getTime()))
        .map(item => ({
          ...item,
          totalTime: typeof item.totalTime === 'number' ? item.totalTime : 0
        }));
    }
    
    if (processedStats.weeklyStats.length > 0) {
      processedStats.weeklyStats = processedStats.weeklyStats
        .filter(item => item && item.weekStart && !isNaN(new Date(item.weekStart).getTime()))
        .map(item => ({
          ...item,
          totalTime: typeof item.totalTime === 'number' ? item.totalTime : 0
        }));
    }
    
    if (processedStats.monthlyStats.length > 0) {
      processedStats.monthlyStats = processedStats.monthlyStats
        .filter(item => item && item.month && !isNaN(new Date(item.month).getTime()))
        .map(item => ({
          ...item,
          totalTime: typeof item.totalTime === 'number' ? item.totalTime : 0
        }));
    }

    // Ensure project stats have colors and valid percentages
    if (processedStats.projectStats.length > 0) {
      processedStats.projectStats = processedStats.projectStats.map(project => ({
        ...project,
        color: project.color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
        totalTime: typeof project.totalTime === 'number' ? project.totalTime : 0,
        percentage: typeof project.percentage === 'number' ? project.percentage : 0
      }));
    }
    
    return processedStats;
  };

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
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'past_7_days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 6); 
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last_week':
          startDate = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          endDate = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last_month':
          startDate = startOfMonth(subMonths(new Date(), 1));
          endDate = endOfMonth(subMonths(new Date(), 1));
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'year':
          startDate = startOfYear(new Date());
          endDate = endOfYear(new Date());
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'all_time':
          startDate = new Date(0); // Beginning of time
          break;
        case 'custom':
          startDate = new Date(customDateRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          endDate.setHours(23, 59, 59, 999);
      }
      
      // Format dates for API - ensure UTC consistency
      const formattedStartDate = format(startDate, 'yyyy-MM-dd\'T\'HH:mm:ss');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd\'T\'HH:mm:ss');
      
      console.log('Fetching data for:', { 
        range: dateRange,
        start: formattedStartDate, 
        end: formattedEndDate
      });
      
      // Add timezone offset parameter to ensure server uses correct timezone
      const timeZoneOffset = new Date().getTimezoneOffset();
      
      const [statsResponse, entriesResponse] = await Promise.all([
        axios.get(`/api/stats?start_date=${formattedStartDate}&end_date=${formattedEndDate}&tz_offset=${timeZoneOffset}`),
        axios.get(`/api/time-entries?start_date=${formattedStartDate}&end_date=${formattedEndDate}&tz_offset=${timeZoneOffset}`)
      ]);
      
      console.log('API response stats:', statsResponse.data);
      
      const processedStats = prepareStatsData(statsResponse.data);
      
      // Debug the daily stats data
      if (processedStats && processedStats.dailyStats) {
        console.log('Daily stats count:', processedStats.dailyStats.length);
        console.log('Total tracked time:', processedStats.totalTrackedTime);
        if (processedStats.dailyStats.length > 0) {
          console.log('Daily average:', processedStats.totalTrackedTime / processedStats.dailyStats.length);
        }
      }
      
      setStats(processedStats);
      
      // Process time entries to ensure valid data
      const validTimeEntries = processTimeEntries(entriesResponse.data || []);
      setTimeEntries(validTimeEntries);
    } catch (error) {
      console.error('Error fetching reports data', error);
      // Show empty data instead of crashing
      setStats(null);
      setTimeEntries([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Validate and process time entries
  const processTimeEntries = (entries: unknown[]): TimeEntry[] => {
    if (!Array.isArray(entries)) return [];
    
    return entries
      .filter(entry => 
        entry && 
        typeof entry === 'object' &&
        entry !== null &&
        'start_time' in entry &&
        entry.start_time && 
        !isNaN(new Date(entry.start_time as string).getTime())
      )
      .map(entry => {
        const typedEntry = entry as Record<string, unknown>;
        return {
          id: typeof typedEntry.id === 'number' ? typedEntry.id : 0,
          task_name: typeof typedEntry.task_name === 'string' ? typedEntry.task_name : 'Unnamed Task',
          project_name: typeof typedEntry.project_name === 'string' ? typedEntry.project_name : 'No Project',
          project_color: typeof typedEntry.project_color === 'string' ? typedEntry.project_color : 'var(--primary-color)',
          start_time: typedEntry.start_time as string,
          end_time: typeof typedEntry.end_time === 'string' ? typedEntry.end_time : null,
          duration: typeof typedEntry.duration === 'number' ? typedEntry.duration : 0,
          description: typeof typedEntry.description === 'string' ? typedEntry.description : null
        };
      })
      .sort((a, b) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
  };

  // Format time from seconds to readable format
  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours >= 10) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    } else if (hours > 0) {
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
    try {
      return format(parseISOWithTimezone(rowData.start_time), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const timeTemplate = (rowData: TimeEntry) => {
    try {
      return `${format(parseISOWithTimezone(rowData.start_time), 'h:mm a')} - ${rowData.end_time ? format(parseISOWithTimezone(rowData.end_time), 'h:mm a') : 'In Progress'}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  const durationTemplate = (rowData: TimeEntry) => {
    return formatTime(rowData.duration);
  };

  // Safe date formatter for axis labels
  const safeDateFormat = (dateString: string | undefined, formatString: string): string => {
    if (!dateString) return '';
    try {
      return format(parseISOWithTimezone(dateString), formatString);
    } catch (error) {
      console.error('Error formatting date for chart:', error);
      return '';
    }
  };

  // Function to determine bar size based on date range
  const getBarSize = () => {
    switch (dateRange) {
      case 'today':
      case 'yesterday':
        return 30; // Wider bars for hourly data
      case 'week':
      case 'last_week':
        return 40; // Wide bars for daily data
      case 'month':
      case 'last_month':
        return 20; // Medium bars for monthly data
      case 'year':
        return 8; // Thin bars for yearly data
      case 'custom': {
        const days = Math.round((customDateRange.endDate.getTime() - customDateRange.startDate.getTime()) / (1000 * 3600 * 24));
        if (days <= 1) return 30;
        if (days <= 7) return 40;
        if (days <= 31) return 20;
        if (days <= 365) return 8;
        return 5;
      }
      default:
        return 50;
    }
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
            <div className="text-sm text-color-secondary mt-1">
              {stats && stats.dailyStats && stats.dailyStats.length > 0
                ? `Per active day (${stats.dailyStats.length} days with entries)`
                : 'Per active day'}
            </div>
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

      {/* Project Breakdown Table */}
      <Card title="Project Breakdown" className="mb-4 overflow-x-auto">
        {stats && stats.projectStats && stats.projectStats.length > 0 ? (
          <DataTable
            value={stats.projectStats}
            responsiveLayout="scroll"
            className="p-datatable-sm"
            emptyMessage="No project data available"
            stripedRows
            sortField="totalTime"
            sortOrder={-1}
            tableStyle={{ minWidth: '100%' }}
            showGridlines
            resizableColumns
            columnResizeMode="fit"
          >
            <Column field="name" header="Project" body={projectColorTemplate} style={{ width: '40%' }} />
            <Column field="totalTime" header="Time" body={(rowData) => formatTime(rowData.totalTime)} sortable style={{ width: '30%' }} />
            <Column field="percentage" header="Percentage" body={percentageTemplate} sortable style={{ width: '30%' }} />
          </DataTable>
        ) : (
          <div className="text-center py-4 text-color-secondary">
            <i className="pi pi-folder-open text-xl mb-3 opacity-60"></i>
            <div>No project data available</div>
            <span className="text-xs mt-2">Try selecting a different date range</span>
          </div>
        )}
      </Card>

      {/* Time Entries Table */}
      <Card title="Time Entries" className="overflow-x-auto">
        <div className="mb-3 flex justify-content-between align-items-center">
          <div className="text-color-secondary">
            <span className="font-medium mr-2">Total entries:</span> 
            <span>{timeEntries.length}</span>
          </div>
          {timeEntries.length > 0 && (
            <div className="text-color-secondary">
              <span className="font-medium mr-2">Total time:</span>
              <span className="text-primary font-medium">
                {formatTime(timeEntries.reduce((total, entry) => total + entry.duration, 0))}
              </span>
            </div>
          )}
        </div>

        <DataTable
          value={timeEntries}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage={
            <div className="flex flex-column align-items-center text-color-secondary py-5">
              <i className="pi pi-clock text-xl mb-3 opacity-60"></i>
              <span>No time entries found for the selected period</span>
              <span className="text-xs mt-2">Try selecting a different date range</span>
            </div>
          }
          responsiveLayout="stack"
          breakpoint="768px"
          className="p-datatable-sm"
          stripedRows
          sortField="start_time"
          sortOrder={-1}
          tableStyle={{ minWidth: '100%' }}
          showGridlines
          resizableColumns
          columnResizeMode="expand"
        >
          <Column field="task_name" header="Task" body={taskTemplate} style={{ width: '30%', minWidth: '150px' }} />
          <Column field="project_name" header="Project" body={projectTemplate} style={{ width: '20%', minWidth: '120px' }} />
          <Column field="start_time" header="Date" body={dateTemplate} sortable style={{ width: '15%', minWidth: '120px' }} />
          <Column field="start_time" header="Time" body={timeTemplate} style={{ width: '20%', minWidth: '150px' }} />
          <Column field="duration" header="Duration" body={durationTemplate} sortable style={{ width: '15%', minWidth: '100px' }} />
        </DataTable>
        
        {/* Responsive info - only shows on small screens */}
        <div className="block md:hidden text-xs text-center text-color-secondary mt-2">
          <i className="pi pi-info-circle mr-1"></i>
          Scroll horizontally to see all columns
        </div>
      </Card>
    </div>
  );
}