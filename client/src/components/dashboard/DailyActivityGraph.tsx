/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import axios from '../../utils/axiosConfig';
import { 
  format, 
  parseISO, 
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
  subYears,
  subWeeks,
  addDays,
  addMonths,
  isSameDay,
  differenceInCalendarMonths,
  differenceInCalendarDays,
  startOfYear,
  endOfYear,
  isValid,
  isSameMonth,
  isSameYear
} from 'date-fns';
import { formatTime } from '../../utils/timeUtils';

import { Card } from 'primereact/card';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
  LabelList
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// Type definitions
interface RawTimeEntry {
  id: number;
  task_id: number;
  task_name: string;
  project_id: number;
  project_name: string;
  project_color: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  description: string | null;
}

interface TimeEntry {
  id?: number;
  task_id?: number;
  task_name?: string;
  project_id?: number;
  project_name?: string;
  project_color?: string;
  start_time: string; // Required for date calculations
  end_time?: string | null;
  duration?: number;
  description?: string | null;
  date?: string;
  totalTime?: number;
}

interface ChartDataItem {
  key: string;
  displayKey: string;
  totalTime: number;
  tooltipText: string;
  isToday?: boolean;
  isCurrent?: boolean;
}

// Chart periods - simplified
type DateRangeOption = 'thisWeek' | 'thisMonth' | 'last6Months' | 'lastYear';

// Function to safely parse dates from strings
const parseDateFromString = (dateStr: string): Date | null => {
  try {
    console.log(`Attempting to parse date: "${dateStr}"`);
    
    if (!dateStr) {
      console.log('Empty date string provided');
      return null;
    }
    
    // Try to parse ISO format
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        console.log(`Parsed ISO date: ${date.toISOString()}`);
        return date;
      }
    }
    
    // Try to parse YYYY-MM-DD format
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        console.log(`Parsed YYYY-MM-DD date: ${date.toISOString()}`);
        return date;
      }
    }
    
    // Try MM/DD/YYYY format
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        console.log(`Parsed MM/DD/YYYY date: ${date.toISOString()}`);
        return date;
      }
    }
    
    // Try Unix timestamp (milliseconds)
    if (!isNaN(Number(dateStr))) {
      const timestamp = Number(dateStr);
      // Check if it's a reasonable timestamp (after 2020-01-01)
      if (timestamp > 1577836800000) { // 2020-01-01
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          console.log(`Parsed timestamp: ${date.toISOString()}`);
          return date;
        }
      }
    }
    
    // Try direct Date parsing as fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      console.log(`Parsed with default Date constructor: ${date.toISOString()}`);
      return date;
    }
    
    console.error(`Failed to parse date: "${dateStr}"`);
    return null;
  } catch (error) {
    console.error(`Error parsing date "${dateStr}":`, error);
    return null;
  }
};

// Format dates consistently for comparison
const formatDateForComparison = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  
  try {
    if (typeof dateInput === 'string') {
      const parsedDate = parseDateFromString(dateInput);
      if (parsedDate) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
      // If parsing fails, try to return just the date part if it looks like a date
      if (dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
        return dateInput.substring(0, 10);
      }
      return '';
    } else {
      // It's already a Date object
      return format(dateInput, 'yyyy-MM-dd');
    }
  } catch (e) {
    console.error('Error formatting date for comparison:', e, dateInput);
    return '';
  }
};

export default function DailyActivityGraph() {
  const { user, token, isReady } = useAuth();
  const toast = useRef<Toast>(null);
  
  // State management
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('thisWeek');
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  // Setup event listener for API connection errors
  useEffect(() => {
    const handleApiConnectionError = (event: CustomEvent) => {
      toast.current?.show({
        severity: 'error',
        summary: 'Connection Error',
        detail: event.detail.message,
        life: 5000
      });
    };

    window.addEventListener('apiConnectionError', handleApiConnectionError as EventListener);
    
    return () => {
      window.removeEventListener('apiConnectionError', handleApiConnectionError as EventListener);
    };
  }, []);

  // Add dependency on auth state
  useEffect(() => {
    // Only fetch data when authentication is ready and we have a user
    if (isReady && user) {
      fetchTimeEntries();
    } else if (isReady && !user) {
      console.log('Auth is ready but no user is logged in');
      // Handle not authenticated state
      setChartData([]);
      setLoading(false);
    }
  }, [dateRangeOption, isReady, user]);

  // Listen for time entry events (deletion and creation)
  useEffect(() => {
    // Create event listeners for time entry events
    const handleTimeEntryDelete = () => {
      fetchTimeEntries();
    };
    
    const handleTimeEntryCreate = () => {
      fetchTimeEntries();
    };
    
    // Register event listeners
    window.addEventListener('timeEntryDeleted', handleTimeEntryDelete);
    window.addEventListener('timeEntryCreated', handleTimeEntryCreate);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('timeEntryDeleted', handleTimeEntryDelete);
      window.removeEventListener('timeEntryCreated', handleTimeEntryCreate);
    };
  }, []);

  // Handle tab change
  const handleTabChange = (e: { index: number }) => {
    setActiveTab(e.index);
    switch (e.index) {
      case 0:
        setDateRangeOption('thisWeek');
        break;
      case 1:
        setDateRangeOption('thisMonth');
        break;
      case 2:
        setDateRangeOption('last6Months');
        break;
      case 3:
        setDateRangeOption('lastYear');
        break;
    }
  };

  // Fetch time entries from API
  const fetchTimeEntries = async () => {
    // Don't try to fetch if not authenticated
    if (!token) {
      console.log('No auth token available, skipping API request');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Calculate date range based on selected option
      let startDate: Date, endDate: Date;
      
      switch (dateRangeOption) {
        case 'thisWeek':
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case 'thisMonth':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case 'last6Months':
          startDate = startOfDay(subMonths(new Date(), 6));
          endDate = endOfDay(new Date());
          break;
        case 'lastYear':
          startDate = startOfDay(subYears(new Date(), 1));
          endDate = endOfDay(new Date());
          break;
        default:
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      }
      
      // Update date range for UI
      setDateRange({ start: startDate, end: endDate });
      
      // Format dates for API
      const startDateParam = format(startDate, 'yyyy-MM-dd');
      const endDateParam = format(endDate, 'yyyy-MM-dd');
      
      console.log(`Fetching time entries for period: ${dateRangeOption}, ${startDateParam} to ${endDateParam}`);
      
      try {
        // Make API request - fetch time entries directly instead of using stats endpoint
        const response = await axios.get('/api/time-entries', {
          params: {
            start_date: startDateParam,
            end_date: endDateParam,
            limit: 1000 // Set a high limit to ensure we get all entries in the date range
          },
          timeout: 5000, // Add timeout to prevent hanging requests
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('API Response:', response);
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`Received ${response.data.length} time entries`);
          
          // Log the first few entries for debugging
          if (response.data.length > 0) {
            console.log('Sample entries:', response.data.slice(0, 3));
          } else {
            console.log('No time entries found in the specified date range');
            // Generate empty chart data with date range
            generateEmptyChartData(startDate, endDate);
            return;
          }
          
          // Process the raw time entries
          const entries: TimeEntry[] = response.data.map((entry: RawTimeEntry) => ({
            id: entry.id,
            task_id: entry.task_id,
            project_id: entry.project_id,
            project_color: entry.project_color,
            task_name: entry.task_name,
            project_name: entry.project_name,
            start_time: entry.start_time,
            end_time: entry.end_time,
            duration: entry.duration || 0, // Ensure duration is not undefined
            description: entry.description,
            date: entry.start_time, // Use start_time as date
            totalTime: entry.duration || 0 // Use duration as totalTime
          }));
          
          console.log('Processed entries:', entries.length);
          setTimeEntries(entries);
          generateChartData(entries, startDate, endDate);
        } else if (response.data && typeof response.data === 'object') {
          // Handle case where response might be paginated or have a different structure
          console.log('Response is not an array but an object:', response.data);
          if (response.data.data && Array.isArray(response.data.data)) {
            const entries: TimeEntry[] = response.data.data.map((entry: RawTimeEntry) => ({
              id: entry.id,
              task_id: entry.task_id,
              project_id: entry.project_id,
              project_color: entry.project_color,
              task_name: entry.task_name,
              project_name: entry.project_name,
              start_time: entry.start_time,
              end_time: entry.end_time,
              duration: entry.duration || 0,
              description: entry.description,
              date: entry.start_time,
              totalTime: entry.duration || 0
            }));
            
            setTimeEntries(entries);
            generateChartData(entries, startDate, endDate);
          } else {
            console.error('Unexpected response format, data property is not an array:', response.data);
            // Generate empty chart data with date range
            generateEmptyChartData(startDate, endDate);
          }
        } else {
          console.error('Unexpected response format:', response.data);
          // Generate empty chart data with date range
          generateEmptyChartData(startDate, endDate);
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);
        // Generate empty chart data with date range
        generateEmptyChartData(startDate, endDate);
        
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load activity data. Showing empty chart.',
          life: 3000
        });
      }
    } catch (error) {
      console.error('Error in fetchTimeEntries function:', error);
      
      // More detailed error logging
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', { 
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load activity data. Please try again.',
        life: 3000
      });
      
      // Generate empty chart with dates
      try {
        const now = new Date();
        const startDate = startOfWeek(now, { weekStartsOn: 1 });
        const endDate = endOfWeek(now, { weekStartsOn: 1 });
        generateEmptyChartData(startDate, endDate);
      } catch (fallbackError) {
        console.error('Failed to generate fallback chart data:', fallbackError);
        setTimeEntries([]);
        setChartData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate empty chart data with proper date labels
  const generateEmptyChartData = (startDate: Date, endDate: Date) => {
    console.log('Generating empty chart data for range:', 
      format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
    
    try {
      if (dateRangeOption === 'thisWeek' || dateRangeOption === 'thisMonth') {
        // Daily view
        const days: ChartDataItem[] = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          days.push({
            key: format(currentDate, 'yyyy-MM-dd'),
            displayKey: format(currentDate, 'EEE dd'),
            totalTime: 0, // No time tracked
            tooltipText: `No time tracked on ${format(currentDate, 'EEE, MMM d')}`,
            isToday: isSameDay(currentDate, new Date())
          });
          currentDate = addDays(currentDate, 1);
        }
        
        setTimeEntries([]);
        setChartData(days);
      } else {
        // Monthly view
        const months: ChartDataItem[] = [];
        let currentMonth = new Date(startDate);
        
        while (currentMonth <= endDate) {
          months.push({
            key: format(currentMonth, 'yyyy-MM'),
            displayKey: format(currentMonth, 'MMM yyyy'),
            totalTime: 0, // No time tracked
            tooltipText: `No time tracked in ${format(currentMonth, 'MMMM yyyy')}`,
            isCurrent: isSameDay(currentMonth, startOfMonth(new Date()))
          });
          currentMonth = addMonths(currentMonth, 1);
        }
        
        setTimeEntries([]);
        setChartData(months);
      }
    } catch (error) {
      console.error('Error generating empty chart data:', error);
      setTimeEntries([]);
      setChartData([]);
    }
  };

  // Generate chart data based on time entries and selected date range
  const generateChartData = (entries: TimeEntry[], startDate: Date, endDate: Date) => {
    console.log(`Generating chart data for ${entries.length} entries from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    
    try {
      if (!entries || entries.length === 0) {
        console.log('No entries to process, generating empty chart');
        generateEmptyChartData(startDate, endDate);
        return;
      }

      // Group by day or month depending on selected date range
      if (dateRangeOption === 'thisWeek' || dateRangeOption === 'thisMonth') {
        // Daily view
        console.log('Generating daily view');
        const dailyData: Record<string, { totalTime: number; entries: TimeEntry[] }> = {};
        
        // Initialize all days in the range
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          dailyData[dateKey] = { totalTime: 0, entries: [] };
          currentDate = addDays(currentDate, 1);
        }
        
        // Aggregate entries by day
        for (const entry of entries) {
          try {
            if (!entry.start_time) {
              console.log('Skipping entry with no start_time:', entry);
              continue;
            }
            
            const entryDate = parseDateFromString(entry.start_time);
            if (!entryDate) {
              console.log('Failed to parse date for entry:', entry);
              continue;
            }
            
            const dateKey = format(entryDate, 'yyyy-MM-dd');
            
            // Only include entries within the selected date range
            if (dailyData[dateKey]) {
              console.log(`Adding entry for ${dateKey}, duration: ${entry.duration || 0}`);
              dailyData[dateKey].totalTime += (entry.duration || 0);
              dailyData[dateKey].entries.push(entry);
            } else {
              console.log(`Entry date ${dateKey} outside selected range, skipping`);
            }
          } catch (error) {
            console.error('Error processing entry:', error, entry);
          }
        }
        
        // Convert to chart data format
        const days: ChartDataItem[] = Object.keys(dailyData).map(dateKey => {
          const date = parseISO(dateKey);
          const totalHours = (dailyData[dateKey].totalTime / 3600).toFixed(1);
          
          return {
            key: dateKey,
            displayKey: format(date, 'EEE dd'),
            totalTime: dailyData[dateKey].totalTime,
            tooltipText: `${totalHours} hours on ${format(date, 'EEE, MMM d')}`,
            isToday: isSameDay(date, new Date())
          };
        });
        
        // Sort by date
        days.sort((a, b) => (a.key > b.key ? 1 : -1));
        console.log(`Generated data for ${days.length} days`);
        setChartData(days);
      } else {
        // Monthly view
        console.log('Generating monthly view');
        const monthlyData: Record<string, { totalTime: number; entries: TimeEntry[] }> = {};
        
        // Initialize all months in the range
        let currentMonth = startOfMonth(startDate);
        while (currentMonth <= endDate) {
          const monthKey = format(currentMonth, 'yyyy-MM');
          monthlyData[monthKey] = { totalTime: 0, entries: [] };
          currentMonth = addMonths(currentMonth, 1);
        }
        
        // Aggregate entries by month
        for (const entry of entries) {
          try {
            if (!entry.start_time) {
              console.log('Skipping entry with no start_time:', entry);
              continue;
            }
            
            const entryDate = parseDateFromString(entry.start_time);
            if (!entryDate) {
              console.log('Failed to parse date for entry:', entry);
              continue;
            }
            
            const monthKey = format(entryDate, 'yyyy-MM');
            
            // Only include entries within the selected date range
            if (monthlyData[monthKey]) {
              console.log(`Adding entry for ${monthKey}, duration: ${entry.duration || 0}`);
              monthlyData[monthKey].totalTime += (entry.duration || 0);
              monthlyData[monthKey].entries.push(entry);
            } else {
              console.log(`Entry month ${monthKey} outside selected range, skipping`);
            }
          } catch (error) {
            console.error('Error processing entry:', error, entry);
          }
        }
        
        // Convert to chart data format
        const months: ChartDataItem[] = Object.keys(monthlyData).map(monthKey => {
          const date = parseISO(`${monthKey}-01`); // First day of month
          const totalHours = (monthlyData[monthKey].totalTime / 3600).toFixed(1);
          
          return {
            key: monthKey,
            displayKey: format(date, 'MMM yyyy'),
            totalTime: monthlyData[monthKey].totalTime,
            tooltipText: `${totalHours} hours in ${format(date, 'MMMM yyyy')}`,
            isCurrent: isSameMonth(date, new Date()) && isSameYear(date, new Date())
          };
        });
        
        // Sort by date
        months.sort((a, b) => (a.key > b.key ? 1 : -1));
        console.log(`Generated data for ${months.length} months`);
        setChartData(months);
      }
    } catch (error) {
      console.error('Error generating chart data:', error);
      // Generate empty chart as fallback
      generateEmptyChartData(startDate, endDate);
    }
  };

  // Remove the cursor-following tooltip approach and use fixed labels instead
  const renderChart = () => {
    // Calculate y-axis max for better scaling
    const maxValue = chartData.length > 0 
      ? Math.max(...chartData.map(d => d.totalTime)) 
      : 0;
    
    // Calculate appropriate y-axis max (in seconds)
    const maxHours = maxValue > 0 
      ? Math.ceil(maxValue / 3600) // Convert to hours and round up
      : 1; // Default to 1 hour if no data
    
    // Set y-axis max in seconds (add 1 hour padding)
    const yAxisMax = (maxHours + 1) * 3600;
    
    return (
      <div className="h-20rem" style={{ position: 'relative' }}>
        {timeEntries.length > 0 || chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 100, right: 30, left: 20, bottom: 5 }}
              barGap={8}
              barCategoryGap={16}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#818CF8" stopOpacity={0.8}/>
                </linearGradient>
                <style>
                  {`
                    .tooltip-wrapper {
                      position: absolute;
                      transform: translate(-50%, -100%);
                      pointer-events: none;
                    }
                  `}
                </style>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="displayKey"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#D1D5DB' }}
              />
              <YAxis 
                tickFormatter={(seconds: number) => `${Math.floor(seconds / 3600)}h`}
                tickLine={false}
                axisLine={{ stroke: '#D1D5DB' }}
                domain={[0, yAxisMax]} 
                allowDecimals={false}
                minTickGap={20}
                ticks={[0, yAxisMax/4, yAxisMax/2, yAxisMax*3/4, yAxisMax]} // Generate even tick marks
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                formatter={(value) => <span style={{ color: '#4F46E5', fontWeight: 500 }}>{value}</span>}
              />
              <Bar 
                dataKey="totalTime" 
                name="Time Tracked" 
                fill="url(#colorGradient)" 
                radius={[4, 4, 0, 0]}
                minPointSize={2}
                maxBarSize={60}
                activeBar={{ 
                  fill: '#4F46E5', 
                  stroke: '#4338CA', 
                  strokeWidth: 1,
                  filter: 'drop-shadow(0px 2px 4px rgba(99, 102, 241, 0.3))'
                }}
                animationDuration={500}
                animationEasing="ease-in-out"
                isAnimationActive={true}
                onMouseEnter={(data) => {
                  // We can use this to highlight the active bar
                }}
              />
              {/* Custom tooltip using mouse event detection instead of Recharts tooltip */}
              <Tooltip 
                content={props => {
                  if (!props.active || !props.payload || props.payload.length === 0) return null;
                  
                  const payloadItem = props.payload[0];
                  const item = payloadItem.payload as ChartDataItem;
                  
                  if (!item || item.totalTime <= 0) return null;
                  
                  // Format the time
                  const seconds = item.totalTime || 0;
                  const hours = Math.floor(seconds / 3600);
                  const minutes = Math.floor((seconds % 3600) / 60);
                  const formattedTime = `${hours}h ${minutes}m`;
                  
                  // Extract date text
                  let dateText = '';
                  if (item.tooltipText && item.tooltipText.includes('on')) {
                    // Extract the date part (after "on")
                    const parts = item.tooltipText.split('on');
                    dateText = parts[1]?.trim() || format(new Date(), 'EEE, MMM d');
                  } else if (item.tooltipText && item.tooltipText.includes('in')) {
                    // Extract the month part (after "in")
                    const parts = item.tooltipText.split('in');
                    dateText = parts[1]?.trim() || format(new Date(), 'MMMM yyyy');
                  } else {
                    // Fallback to displayKey
                    dateText = item.displayKey;
                  }
                  
                  return (
                    <div
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        padding: '12px 16px',
                        border: '1px solid #EBF2FD',
                        width: '160px',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        position: 'relative',
                        transform: 'translate(-56%, -100%)'
                      }}
                    >
                      {/* Arrow pointing to the bar */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-6px',
                          left: '50%',
                          transform: 'translateX(-50%) rotate(45deg)',
                          width: '12px',
                          height: '12px',
                          backgroundColor: 'white',
                          borderRight: '1px solid #EBF2FD',
                          borderBottom: '1px solid #EBF2FD',
                          zIndex: 1,
                        }}
                      ></div>
                      
                      {/* Date Display */}
                      <div
                        style={{
                          color: '#6366F1',
                          fontWeight: 500,
                          fontSize: '0.9rem',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <i className="pi pi-calendar-plus mr-2" style={{ fontSize: '0.8rem' }}></i>
                        {dateText}
                      </div>
                      
                      {/* Time Display */}
                      <div
                        style={{
                          color: '#1F2937',
                          fontWeight: 700,
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <i className="pi pi-clock mr-2" style={{ fontSize: '1rem', color: '#4F46E5' }}></i>
                        {formattedTime}
                      </div>
                    </div>
                  );
                }}
                cursor={false}
                offset={0}
                position={{ x: 0, y: -10 }}
                wrapperStyle={{ 
                  zIndex: 1000, 
                  pointerEvents: 'none'
                }}
                allowEscapeViewBox={{ x: true, y: true }}
                isAnimationActive={false}
              />
              {/* Reference line for today or current period */}
              {chartData.some(d => d.isToday || d.isCurrent) && (
                <ReferenceLine 
                  x={chartData.find(d => d.isToday || d.isCurrent)?.displayKey} 
                  stroke="#FF4081" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{ 
                    value: ['thisWeek', 'thisMonth'].includes(dateRangeOption) ? 'Today' : 'Current', 
                    position: 'insideTopRight',
                    fill: '#FF4081',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-column align-items-center justify-content-center h-full">
            <i className="pi pi-chart-bar text-color-secondary text-5xl mb-3"></i>
            <div className="text-color-secondary text-center">
              <p className="m-0 mb-2 font-medium">No activity data available</p>
              <p className="m-0 text-sm mb-3">Try a different time period or start tracking time</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card title="Activity Summary">
        <div className="flex justify-content-center align-items-center" style={{ height: '300px' }}>
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
        </div>
      </Card>
    );
  }

  // Main render
  return (
    <Card title="Activity Summary">
      <Toast ref={toast} />
      
      {/* Date range display */}
      <div className="flex justify-content-between align-items-center mb-3">
        <div>
          <span className="text-sm text-color-secondary">
            {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
          </span>
        </div>
        <Button 
          icon="pi pi-refresh" 
          className="p-button-rounded p-button-text p-button-sm" 
          tooltip="Refresh data"
          tooltipOptions={{ position: 'left' }}
          onClick={fetchTimeEntries}
          loading={loading}
        />
      </div>
      
      {/* Time period tabs */}
      <TabView activeIndex={activeTab} onTabChange={handleTabChange}>
        <TabPanel header="This Week">
          {activeTab === 0 && renderChart()}
        </TabPanel>
        <TabPanel header="This Month">
          {activeTab === 1 && renderChart()}
        </TabPanel>
        <TabPanel header="Last 6 Months">
          {activeTab === 2 && renderChart()}
        </TabPanel>
        <TabPanel header="Last Year">
          {activeTab === 3 && renderChart()}
        </TabPanel>
      </TabView>
    </Card>
  );
}