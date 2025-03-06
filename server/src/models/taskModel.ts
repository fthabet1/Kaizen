// server/src/models/TaskModel.ts
import db from '../config/db';
import { Task, CreateTaskDto, UpdateTaskDto } from '../types';

class TaskModel {
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
   * Create a new task
   */
  static async create(userId: number, taskData: CreateTaskDto): Promise<Task> {
    const { project_id, name, description } = taskData;
    
    const query = `
      INSERT INTO tasks (project_id, user_id, name, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      project_id, 
      userId, 
      name, 
      description || null
    ]);
    
    return result.rows[0];
  }

  /**
   * Find all tasks for a user with optional filters
   */
  static async findByUserId(
    userId: number, 
    options: { 
      projectId?: number;
      isCompleted?: boolean;
      searchTerm?: string;
    } = {}
  ): Promise<Task[]> {
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    const params: (string | number)[] = [userId];
    let paramIndex = 2;
    
    // Add project_id filter if provided
    if (options.projectId !== undefined) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(options.projectId);
      paramIndex++;
    }
    
    // Add is_completed filter if provided
    if (options.isCompleted !== undefined) {
      query += ` AND is_completed = $${paramIndex}`;
      params.push(Number(options.isCompleted));
      paramIndex++;
    }
    
    // Add search filter if provided
    if (options.searchTerm) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${options.searchTerm}%`);
      paramIndex++;
    }
    
    // Add order by
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Find a task by ID
   */
  static async findById(id: number): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update a task
   */
  static async update(id: number, data: UpdateTaskDto): Promise<Task> {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.project_id !== undefined) {
      updates.push(`project_id = $${paramIndex}`);
      values.push(data.project_id);
      paramIndex++;
    }

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(data.description || null);
      paramIndex++;
    }

    if (data.is_completed !== undefined) {
      updates.push(`is_completed = $${paramIndex}`);
      values.push(data.is_completed);
      paramIndex++;
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // If no updates, return current task
    if (values.length === 0) {
      return this.findById(id) as Promise<Task>;
    }

    // Add task id to values array
    values.push(id);

    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a task
   */
  static async delete(id: number): Promise<void> {
    // This will cascade to time entries due to our DB constraints
    const query = 'DELETE FROM tasks WHERE id = $1';
    await db.query(query, [id]);
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(
    taskId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    // Get task details
    const taskQuery = `
      SELECT 
        t.*,
        p.name as project_name,
        p.color as project_color
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;
    
    const taskResult = await db.query(taskQuery, [taskId]);
    
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }
    
    const task = taskResult.rows[0];
    
    // Get time entries stats
    let timeEntriesQuery = `
      SELECT 
        COUNT(*) as entry_count,
        COALESCE(SUM(duration), 0) as total_time,
        MIN(start_time) as first_entry,
        MAX(start_time) as last_entry
      FROM time_entries
      WHERE task_id = $1
    `;
    
    const timeEntryParams = [taskId];
    
    // Add date filters if provided
    if (startDate) {
      timeEntriesQuery += ` AND start_time >= $${timeEntryParams.length + 1}`;
      timeEntryParams.push(startDate.getTime());
    }
    
    if (endDate) {
      timeEntriesQuery += ` AND start_time <= $${timeEntryParams.length + 1}`;
      timeEntryParams.push(endDate.getTime());
    }
    
    const timeStatsResult = await db.query(timeEntriesQuery, timeEntryParams);
    const timeStats = timeStatsResult.rows[0];
    
    // Get daily time entries
    let dailyQuery = `
      SELECT 
        DATE(start_time) as date,
        COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE task_id = $1
    `;
    
    const dailyParams = [taskId];
    
    // Add date filters if provided
    if (startDate) {
      dailyQuery += ` AND start_time >= $${dailyParams.length + 1}`;
      dailyParams.push(startDate.getTime());
    }
    
    if (endDate) {
      dailyQuery += ` AND start_time <= $${dailyParams.length + 1}`;
      dailyParams.push(endDate.getTime());
    }
    
    dailyQuery += ` GROUP BY DATE(start_time) ORDER BY DATE(start_time)`;
    
    const dailyResult = await db.query(dailyQuery, dailyParams);
    
    // Get recent time entries
    let recentEntriesQuery = `
      SELECT *
      FROM time_entries
      WHERE task_id = $1
      ORDER BY start_time DESC
      LIMIT 10
    `;
    
    const recentEntriesResult = await db.query(recentEntriesQuery, [taskId]);
    
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      isCompleted: task.is_completed,
      projectId: task.project_id,
      projectName: task.project_name,
      projectColor: task.project_color,
      entryCount: parseInt(timeStats.entry_count),
      totalTime: parseInt(timeStats.total_time) || 0,
      firstEntry: timeStats.first_entry,
      lastEntry: timeStats.last_entry,
      dailyTime: dailyResult.rows.map(row => ({
        date: row.date,
        totalTime: parseInt(row.total_time)
      })),
      recentEntries: recentEntriesResult.rows
    };
  }

  /**
   * Find tasks by project ID
   */
  static async findByProjectId(projectId: number): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [projectId]);
    return result.rows;
  }
}

export default TaskModel;
