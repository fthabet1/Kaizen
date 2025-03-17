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
  eachDayOfInterval,
  addDays,
  subDays,
  isSameDay
} from 'date-fns';
import { formatTime } from '../../utils/timeUtils';

import { Card } from 'primereact/card';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';

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
  TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DailyStats {
  date: string;
  totalTime: number;
}

interface UserSettings {
  week_start: number; // 0 for Sunday, 1 for Monday
}

interface DateRangeOption {
  label: string;
  value: string;
}

interface ChartDataItem {
  date: string;
  displayDate: string;
  totalTime: number;
  fullDisplayDate: string;
  isToday: boolean;
}

export default function DailyActivityGraph() {
  const { user } = useAuth();
  const toast = useRef<Toast>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('week');
  const [weekStart, setWeekStart] = useState<number>(1); // Default to Monday
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  const dateRangeOptions: DateRangeOption[] = [
    { label: 'This Week', value: 'week' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'Last 2 Weeks', value: 'twoWeeks' },
    { label: 'This Month', value: 'month' }
  ];

  useEffect(() => {
    if (user) {
      fetchUserSettings();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDailyStats();
    }
  }, [user, dateRange, weekStart]);

  const fetchUserSettings = async () => {
    try {
      const response = await axios.get('/api/users/settings');
      if (response.data) {
        setWeekStart(response.data.week_start);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  const fetchDailyStats = async () => {
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date = new Date();
      
      // Calculate date range based on selection and user's week start preference
      const weekStartOption = weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      
      switch (dateRange) {
        case 'week':
          startDate = startOfWeek(new Date(), { weekStartsOn: weekStartOption });
          endDate = endOfWeek(new Date(), { weekStartsOn: weekStartOption });
          break;
        case 'lastWeek':
          endDate = subDays(startOfWeek(new Date(), { weekStartsOn: weekStartOption }), 1);
          startDate = startOfWeek(endDate, { weekStartsOn: weekStartOption });
          break;
        case 'twoWeeks':
          startDate = subDays(startOfWeek(new Date(), { weekStartsOn: weekStartOption }), 7);
          endDate = endOfWeek(new Date(), { weekStartsOn: weekStartOption });
          break;
        case 'month':
          startDate = new Date();
          startDate.setDate(1); // First day of the current month
          break;
        default:
          startDate = startOfWeek(new Date(), { weekStartsOn: weekStartOption });
          endDate = endOfWeek(new Date(), { weekStartsOn: weekStartOption });
      }
      
      // Format dates for API
      const startDateParam = format(startDate, 'yyyy-MM-dd');
      const endDateParam = format(endDate, 'yyyy-MM-dd');
      
      const response = await axios.get(`/api/stats?start_date=${startDateParam}&end_date=${endDateParam}`);
      
      if (response.data && response.data.dailyStats) {
        setDailyStats(response.data.dailyStats);
        
        generateChartData(startDate, endDate, response.data.dailyStats);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load daily activity data',
        life: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (startDate: Date, endDate: Date, stats: DailyStats[]) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Map each day to chart data, filling in with zeroes for days with no data
    const data = days.map(day => {
      const formattedDate = format(day, 'yyyy-MM-dd');
      const stat = stats.find(s => {
        // Need to compare dates without time
        const statDate = parseISO(s.date);
        return isSameDay(statDate, day);
      });
      
      return {
        date: formattedDate,
        displayDate: format(day, 'EEE'), // Short day name
        totalTime: stat ? stat.totalTime : 0,
        fullDisplayDate: format(day, 'MMM d'),
        isToday: isSameDay(day, new Date())
      };
    });
    
    setChartData(data);
  };

  const CustomTooltip = ({ 
    active, 
    payload 
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length > 0) {
      const payloadItem = payload[0].payload as ChartDataItem;
      return (
        <div className="recharts-custom-tooltip p-2 shadow-2 border-round bg-white">
          <p className="font-medium mb-2">{payloadItem.fullDisplayDate}</p>
          <p>{formatTime(payloadItem.totalTime)}</p>
        </div>
      );
    }
  
    return null;
  };

  const handleDateRangeChange = (e: DropdownChangeEvent) => {
    setDateRange(e.value);
  };

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
      </div>
    );
  }

  return (
    <Card title="Daily Activity">
      <Toast ref={toast} />
      
      <div className="flex justify-content-end mb-3">
        <Dropdown
          value={dateRange}
          options={dateRangeOptions}
          onChange={handleDateRangeChange}
          placeholder="Select Range"
          className="w-12rem"
        />
      </div>
      
      <div className="h-20rem">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="displayDate"
                tick={{ fontSize: 14 }}
              />
              <YAxis 
                tickFormatter={(seconds: number) => `${Math.floor(seconds / 3600)}h`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="totalTime" 
                name="Time Tracked" 
                fill="var(--primary-color)" 
                radius={[4, 4, 0, 0]}
              />
              {/* Reference line for today */}
              {chartData.some(d => d.isToday) && (
                <ReferenceLine 
                  x={chartData.find(d => d.isToday)?.displayDate} 
                  stroke="#FF0000" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{ value: 'Today', position: 'top', fill: '#FF0000' }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex align-items-center justify-content-center h-full text-color-secondary">
            No daily activity data available for this period
          </div>
        )}
      </div>
      
      <div className="text-center text-sm text-color-secondary mt-3">
        <p>
          {dateRange === 'week' && 'Showing your activity for this week'}
          {dateRange === 'lastWeek' && 'Showing your activity for last week'}
          {dateRange === 'twoWeeks' && 'Showing your activity for the last two weeks'}
          {dateRange === 'month' && 'Showing your activity for this month'}
        </p>
        <p>Week starts on {weekStart === 0 ? 'Sunday' : 'Monday'} based on your settings</p>
      </div>
    </Card>
  );
}