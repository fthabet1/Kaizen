// server/src/models/TimeEntryModel.ts
import db from '../config/db';
import { TimeEntry, CreateTimeEntryDto, UpdateTimeEntryDto } from '../types';

class TimeEntryModel {
  /**
   * Helper function to get user's internal ID from auth_id
   */
  static async getUserIdByAuthId(authId: string): Promise<number> {
    const userResult = await db.query('SELECT id FROM users WHERE auth_id = $1', [authId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    return userResult.rows[0].id;
  }

  /**
   * Create a new time entry
   */
  static async create(userId: number, timeEntryData: CreateTimeEntryDto): Promise<TimeEntry> {
    const { task_id, start_time, end_time, duration, description } = timeEntryData;
    
    let query: string;
    let params: any[];
    
    if (end_time) {
      // If end time is provided, calculate duration if not provided
      const calculatedDuration = duration || Math.floor((end_time.getTime() - start_time.getTime()) / 1000);
      
      query = `
        INSERT INTO time_entries (task_id, user_id, start_time, end_time, duration, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      params = [
        task_id, 
        userId, 
        start_time, 
        end_time, 
        calculatedDuration, 
        description || null
      ];
    } else {
      // If no end time, don't include duration
      query = `
        INSERT INTO time_entries (task_id, user_id, start_time, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      params = [
        task_id, 
        userId, 
        start_time, 
        description || null
      ];
    }
    
    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Find all time entries for a user with optional filters
   */
  static async findByUserId(
    userId: number, 
    options: { 
      taskId?: number;
      isActive?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<TimeEntry[]> {
    let query = `
      SELECT 
        te.*,
        t.name as task_name,
        p.name as project_name,
        p.color as project_color
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Add task_id filter if provided
    if (options.taskId !== undefined) {
      query += ` AND te.task_id = $${paramIndex}`;
      params.push(options.taskId);
      paramIndex++;
    }
    
    // Add active filter if provided
    if (options.isActive) {
      query += ` AND te.end_time IS NULL`;
    }
    
    // Add date filters if provided
    if (options.startDate) {
      query += ` AND te.start_time >= $${paramIndex}`;
      params.push(options.startDate.getTime());
      paramIndex++;
    }
    
    if (options.endDate) {
      query += ` AND te.start_time <= $${paramIndex}`;
      params.push(options.endDate.getTime());
      paramIndex++;
    }
    
    // Add order by
    query += ' ORDER BY te.start_time DESC';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Find recent time entries for a user
   */
  static async findRecentByUserId(
    userId: number,
    limit: number = 10
  ): Promise<any[]> {
    const query = `
      SELECT 
        te.*,
        t.name as task_name,
        p.name as project_name,
        p.color as project_color
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.user_id = $1
      AND te.end_time IS NOT NULL
      ORDER BY te.start_time DESC
      LIMIT $2
    `;
    
    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Find a time entry by ID
   */
  static async findById(id: number): Promise<TimeEntry | null> {
    const query = 'SELECT * FROM time_entries WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find active time entry for a user
   */
  static async findActiveByUserId(userId: number): Promise<any | null> {
    const query = `
      SELECT 
        te.*,
        t.name as task_name,
        p.name as project_name,
        p.color as project_color,
        p.id as project_id
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.user_id = $1
      AND te.end_time IS NULL
      ORDER BY te.start_time DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Update a time entry
   */
  static async update(id: number, data: UpdateTimeEntryDto): Promise<TimeEntry> {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.task_id !== undefined) {
      updates.push(`task_id = $${paramIndex}`);
      values.push(data.task_id);
      paramIndex++;
    }

    if (data.start_time !== undefined) {
      updates.push(`start_time = $${paramIndex}`);
      values.push(data.start_time);
      paramIndex++;
    }

    if (data.end_time !== undefined) {
      updates.push(`end_time = $${paramIndex}`);
      values.push(data.end_time);
      paramIndex++;
      
      // If end_time is provided but no duration, calculate it
      if (data.duration === undefined) {
        const entry = await this.findById(id);
        
        if (entry && entry.start_time) {
          const startTime = new Date(entry.start_time);
          const endTime = new Date(data.end_time);
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          
          updates.push(`duration = $${paramIndex}`);
          values.push(duration);
          paramIndex++;
        }
      }
    }

    if (data.duration !== undefined) {
      updates.push(`duration = $${paramIndex}`);
      values.push(data.duration);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(data.description || null);
      paramIndex++;
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // If no updates, return current time entry
    if (values.length === 0) {
      return this.findById(id) as Promise<TimeEntry>;
    }

    // Add time entry id to values array
    values.push(id);

    const query = `
      UPDATE time_entries
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a time entry
   */
  static async delete(id: number): Promise<void> {
    const query = 'DELETE FROM time_entries WHERE id = $1';
    await db.query(query, [id]);
  }

  /**
   * Get total tracked time for a user
   */
  static async getTotalTrackedTime(
    userId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<number> {
    let query = `
      SELECT COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE user_id = $1
      AND duration IS NOT NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Add date filters if provided
    if (startDate) {
      query += ` AND start_time >= $${paramIndex}`;
      params.push(startDate.getTime());
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND start_time <= $${paramIndex}`;
      params.push(endDate.getTime());
      paramIndex++;
    }
    
    const result = await db.query(query, params);
    return parseInt(result.rows[0].total_time);
  }

  /**
   * Get time entries grouped by day
   */
  static async getTimeEntriesByDay(
    userId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<any[]> {
    let query = `
      SELECT 
        DATE(start_time) as date,
        COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE user_id = $1
      AND duration IS NOT NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Add date filters if provided
    if (startDate) {
      query += ` AND start_time >= $${paramIndex}`;
      params.push(startDate.getTime());
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND start_time <= $${paramIndex}`;
      params.push(endDate.getTime());
      paramIndex++;
    }
    
    query += ` GROUP BY DATE(start_time) ORDER BY DATE(start_time)`;
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get time entries grouped by week
   */
  static async getTimeEntriesByWeek(
    userId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<any[]> {
    let query = `
      SELECT 
        DATE_TRUNC('week', start_time) as week_start,
        COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE user_id = $1
      AND duration IS NOT NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Add date filters if provided
    if (startDate) {
      query += ` AND start_time >= $${paramIndex}`;
      params.push(startDate.getTime());
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND start_time <= $${paramIndex}`;
      params.push(endDate.getTime());
      paramIndex++;
    }
    
    query += ` GROUP BY DATE_TRUNC('week', start_time) ORDER BY week_start`;
    
    const result = await db.query(query, params);
    return result.rows.map(row => ({
      weekStart: row.week_start,
      totalTime: parseInt(row.total_time)
    }));
  }

  /**
   * Get time entries grouped by month
   */
  static async getTimeEntriesByMonth(
    userId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<any[]> {
    let query = `
      SELECT 
        DATE_TRUNC('month', start_time) as month,
        COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE user_id = $1
      AND duration IS NOT NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Add date filters if provided
    if (startDate) {
      query += ` AND start_time >= $${paramIndex}`;
      params.push(startDate.getTime());
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND start_time <= $${paramIndex}`;
      params.push(endDate.getTime());
      paramIndex++;
    }
    
    query += ` GROUP BY DATE_TRUNC('month', start_time) ORDER BY month`;
    
    const result = await db.query(query, params);
    return result.rows.map(row => ({
      month: row.month,
      totalTime: parseInt(row.total_time)
    }));
  }

  /**
   * Get time distribution by project
   */
  static async getTimeByProject(
    userId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<any[]> {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.color,
        COALESCE(SUM(te.duration), 0) as total_time
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN time_entries te ON t.id = te.task_id
      WHERE p.user_id = $1
      AND p.is_active = true
      AND te.duration IS NOT NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    // Add date filters if provided
    if (startDate) {
      query += ` AND te.start_time >= $${paramIndex}`;
      params.push(startDate.getTime());
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND te.start_time <= $${paramIndex}`;
      params.push(endDate.getTime());
      paramIndex++;
    }
    
    query += ` GROUP BY p.id, p.name, p.color ORDER BY total_time DESC`;
    
    const result = await db.query(query, params);
    
    // Calculate percentages
    const projects = result.rows;
    const totalTime = projects.reduce((sum, project) => sum + parseInt(project.total_time), 0);
    
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      color: project.color,
      totalTime: parseInt(project.total_time),
      percentage: totalTime > 0 ? (parseInt(project.total_time) / totalTime) * 100 : 0
    }));
  }
}

export default TimeEntryModel;
