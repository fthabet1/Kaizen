// server/src/controllers/statsController.ts
import { Request, Response } from 'express';
import TimeEntryModel from '../models/timeEntryModel';
import ProjectModel from '../models/projectModel';
import TaskModel from '../models/taskModel';

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });

      return;
    }
    
    // Get start and end dates from query params if provided
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    
    // Get user's internal ID
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    // Get stats in parallel
    const [
      totalTrackedTime,
      projectStats,
      dailyStats,
      weeklyStats,
      monthlyStats
    ] = await Promise.all([
      TimeEntryModel.getTotalTrackedTime(userIdResult, startDate, endDate),
      TimeEntryModel.getTimeByProject(userIdResult, startDate, endDate),
      TimeEntryModel.getTimeEntriesByDay(userIdResult, startDate, endDate),
      TimeEntryModel.getTimeEntriesByWeek(userIdResult, startDate, endDate),
      TimeEntryModel.getTimeEntriesByMonth(userIdResult, startDate, endDate)
    ]);
    
    res.status(200).json({
      totalTrackedTime,
      projectStats,
      dailyStats,
      weeklyStats,
      monthlyStats
    });
  } catch (error: any) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: error.message || 'Error getting user stats' });
  }
};

export const getProductivityTrends = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Default to last 30 days if no dates provided
    const endDate = req.query.end_date 
      ? new Date(req.query.end_date as string) 
      : new Date();
    
    const startDate = req.query.start_date 
      ? new Date(req.query.start_date as string) 
      : new Date(endDate);
    
    startDate.setDate(startDate.getDate() - 30);
    
    // Get user's internal ID
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    // Get daily stats for the period
    const dailyStats = await TimeEntryModel.getTimeEntriesByDay(userIdResult, startDate, endDate);
    
    // Calculate moving average (7-day)
    const movingAverages = [];
    for (let i = 6; i < dailyStats.length; i++) {
      const last7Days = dailyStats.slice(i - 6, i + 1);
      const sum = last7Days.reduce((acc: number, day: { date: string; total_time: string | number }) => 
        acc + parseInt(String(day.total_time)), 0);
      const average = sum / 7;
      
      movingAverages.push({
        date: dailyStats[i].date,
        movingAverage: average
      });
    }
    
    // Get task completion data
    const taskCompletionQuery = `
      SELECT 
        DATE(updated_at) as date,
        COUNT(*) as completed_count
      FROM tasks
      WHERE user_id = $1
      AND is_completed = true
      AND updated_at BETWEEN $2 AND $3
      GROUP BY DATE(updated_at)
      ORDER BY date
    `;
    
    const client = await db.getClient();
    
    try {
      const taskResult = await client.query(taskCompletionQuery, [
        userIdResult, 
        startDate, 
        endDate
      ]);
      
      res.status(200).json({
        dailyStats,
        movingAverages,
        taskCompletions: taskResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting productivity trends:', error);
    res.status(500).json({ error: error.message || 'Error getting productivity trends' });
  }
};

export const getComparisonStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Get periods for comparison
    const currentPeriodEnd = req.query.current_end 
      ? new Date(req.query.current_end as string) 
      : new Date();
    
    const currentPeriodStart = req.query.current_start 
      ? new Date(req.query.current_start as string) 
      : new Date(currentPeriodEnd);
    
    // Default to 7 days
    if (!req.query.current_start) {
      currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
    }
    
    // Previous period is the same length of time before current period
    const periodLength = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const previousPeriodEnd = new Date(currentPeriodStart);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);
    
    // Get user's internal ID
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    // Get stats for both periods
    const [currentPeriodTotal, previousPeriodTotal] = await Promise.all([
      TimeEntryModel.getTotalTrackedTime(userIdResult, currentPeriodStart, currentPeriodEnd),
      TimeEntryModel.getTotalTrackedTime(userIdResult, previousPeriodStart, previousPeriodEnd)
    ]);
    
    // Calculate change and percentage
    const absoluteChange = currentPeriodTotal - previousPeriodTotal;
    const percentageChange = previousPeriodTotal === 0 
      ? 100 // If previous was 0, we're up by 100%
      : (absoluteChange / previousPeriodTotal) * 100;
    
    res.status(200).json({
      currentPeriod: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
        totalTime: currentPeriodTotal
      },
      previousPeriod: {
        start: previousPeriodStart,
        end: previousPeriodEnd,
        totalTime: previousPeriodTotal
      },
      comparison: {
        absoluteChange,
        percentageChange
      }
    });
  } catch (error: any) {
    console.error('Error getting comparison stats:', error);
    res.status(500).json({ error: error.message || 'Error getting comparison stats' });
  }
};

export const getProjectDistribution = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Get start and end dates from query params if provided
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    
    // Get user's internal ID
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    // Get project time distribution
    const projectStats = await TimeEntryModel.getTimeByProject(userIdResult, startDate, endDate);
    
    res.status(200).json(projectStats);
  } catch (error: any) {
    console.error('Error getting project distribution:', error);
    res.status(500).json({ error: error.message || 'Error getting project distribution' });
  }
};

// Import the database client for raw queries
import db from '../config/db';

export const getDailyPatterns = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Get user's internal ID
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    // Get hourly distribution for each day of the week
    const hourlyQuery = `
      SELECT 
        EXTRACT(DOW FROM start_time) as day_of_week,
        EXTRACT(HOUR FROM start_time) as hour,
        COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE user_id = $1
      AND duration IS NOT NULL
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;
    
    const client = await db.getClient();
    
    try {
      const hourlyResult = await client.query(hourlyQuery, [userIdResult]);
      
      // Transform into a more useful format
      const hourlyByDay = [0, 1, 2, 3, 4, 5, 6].map(day => {
        interface HourlyEntry {
          day_of_week: string;
          hour: string;
          total_time: string;
        }
        
        const dayEntries: HourlyEntry[] = hourlyResult.rows.filter((row: HourlyEntry) => parseInt(row.day_of_week) === day);
        const hourData = Array(24).fill(0);
        
        dayEntries.forEach(entry => {
          hourData[parseInt(entry.hour)] = parseInt(entry.total_time);
        });
        
        return {
          dayOfWeek: day,
          hourData
        };
      });
      
      // Get most productive day
      const dailyTotalsQuery = `
        SELECT 
          EXTRACT(DOW FROM start_time) as day_of_week,
          COALESCE(SUM(duration), 0) as total_time
        FROM time_entries
        WHERE user_id = $1
        AND duration IS NOT NULL
        GROUP BY day_of_week
        ORDER BY total_time DESC
      `;
      
      const dailyTotalsResult = await client.query(dailyTotalsQuery, [userIdResult]);
      
      // Get most productive hour
      const hourlyTotalsQuery = `
        SELECT 
          EXTRACT(HOUR FROM start_time) as hour,
          COALESCE(SUM(duration), 0) as total_time
        FROM time_entries
        WHERE user_id = $1
        AND duration IS NOT NULL
        GROUP BY hour
        ORDER BY total_time DESC
      `;
      
      const hourlyTotalsResult = await client.query(hourlyTotalsQuery, [userIdResult]);
      
      res.status(200).json({
        hourlyByDay,
        mostProductiveDay: dailyTotalsResult.rows.length > 0 
          ? parseInt(dailyTotalsResult.rows[0].day_of_week) 
          : null,
        mostProductiveHour: hourlyTotalsResult.rows.length > 0 
          ? parseInt(hourlyTotalsResult.rows[0].hour) 
          : null
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting daily patterns:', error);
    res.status(500).json({ error: error.message || 'Error getting daily patterns' });
  }
};
