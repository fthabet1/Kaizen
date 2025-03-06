// server/src/models/ProjectModel.ts
import db from '../config/db';
import { Project, CreateProjectDto, UpdateProjectDto } from '../types';

class ProjectModel {
  /**
   * Create a new project
   */
  static async create(userId: string, projectData: CreateProjectDto): Promise<Project> {
    // Get the user's internal ID from the auth_id
    const userResult = await db.query('SELECT id FROM users WHERE auth_id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const internalUserId = userResult.rows[0].id;
    
    const { name, description, color } = projectData;
    
    const query = `
      INSERT INTO projects (user_id, name, description, color)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      internalUserId, 
      name, 
      description || null, 
      color || '#0EA5E9'
    ]);
    
    return result.rows[0];
  }

  /**
   * Find all projects for a user
   */
  static async findByUserId(
    userId: string, 
    options: { isActive?: boolean } = {}
  ): Promise<Project[]> {
    // Get the user's internal ID from the auth_id
    const userResult = await db.query('SELECT id FROM users WHERE auth_id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const internalUserId = userResult.rows[0].id;
    
    let query = 'SELECT * FROM projects WHERE user_id = $1';
    const params = [internalUserId];
    
    // Add is_active filter if provided
    if (options.isActive !== undefined) {
      query += ' AND is_active = $2';
      params.push(options.isActive);
    }
    
    // Add order by
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Find a project by ID
   */
  static async findById(id: number): Promise<Project | null> {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update a project
   */
  static async update(id: number, data: UpdateProjectDto): Promise<Project> {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

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

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(data.color);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(data.is_active);
      paramIndex++;
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // If no updates, return current project
    if (values.length === 0) {
      return this.findById(id) as Promise<Project>;
    }

    // Add project id to values array
    values.push(id);

    const query = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a project
   */
  static async delete(id: number): Promise<void> {
    // This will cascade to tasks and time entries due to our DB constraints
    const query = 'DELETE FROM projects WHERE id = $1';
    await db.query(query, [id]);
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(
    projectId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    let query = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.color as project_color,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(te.id) as time_entry_count,
        COALESCE(SUM(te.duration), 0) as total_time
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN time_entries te ON t.id = te.task_id
    `;
    
    const queryParams = [projectId];
    let whereClause = 'WHERE p.id = $1';
    
    // Add date filters if provided
    if (startDate) {
      whereClause += ` AND te.start_time >= $${queryParams.length + 1}`;
      queryParams.push(startDate.getTime());
    }
    
    if (endDate) {
      whereClause += ` AND te.start_time <= $${queryParams.length + 1}`;
      queryParams.push(endDate.getTime());
    }
    
    query += ` ${whereClause} GROUP BY p.id, p.name, p.color`;
    
    // Get the project stats
    const statsResult = await db.query(query, queryParams);
    const projectStats = statsResult.rows[0] || {
      project_id: projectId,
      project_name: '',
      project_color: '',
      task_count: 0,
      time_entry_count: 0,
      total_time: 0
    };
    
    // Get the project details if stats are empty
    if (!projectStats.project_name) {
      const projectResult = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projectResult.rows.length > 0) {
        const project = projectResult.rows[0];
        projectStats.project_name = project.name;
        projectStats.project_color = project.color;
      }
    }
    
    // Get task completion stats
    const taskStatsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_tasks
      FROM tasks
      WHERE project_id = $1
    `;
    
    const taskStatsResult = await db.query(taskStatsQuery, [projectId]);
    const taskStats = taskStatsResult.rows[0] || { 
      total_tasks: 0, 
      completed_tasks: 0 
    };
    
    // Get time entries by day
    let timeEntriesQuery = `
      SELECT 
        DATE(te.start_time) as date,
        COALESCE(SUM(te.duration), 0) as total_time
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE t.project_id = $1
    `;
    
    const timeEntryParams = [projectId];
    
    // Add date filters if provided
    if (startDate) {
      timeEntriesQuery += ` AND te.start_time >= $${timeEntryParams.length + 1}`;
      timeEntryParams.push(startDate.getTime());
    }
    
    if (endDate) {
      timeEntriesQuery += ` AND te.start_time <= $${timeEntryParams.length + 1}`;
      timeEntryParams.push(endDate.getTime());
    }
    
    timeEntriesQuery += ` GROUP BY DATE(te.start_time) ORDER BY DATE(te.start_time)`;
    
    const dailyTimeResult = await db.query(timeEntriesQuery, timeEntryParams);
    
    return {
      id: projectStats.project_id,
      name: projectStats.project_name,
      color: projectStats.project_color,
      taskCount: parseInt(projectStats.task_count),
      completedTasks: parseInt(taskStats.completed_tasks),
      totalTasks: parseInt(taskStats.total_tasks),
      timeEntryCount: parseInt(projectStats.time_entry_count),
      totalTime: parseInt(projectStats.total_time) || 0,
      dailyTime: dailyTimeResult.rows.map((row) => ({
        date: row.date,
        totalTime: parseInt(row.total_time)
      }))
    };
  }

  /**
   * Get tasks for a project
   */
  static async getProjectTasks(projectId: number): Promise<any[]> {
    const query = `
      SELECT 
        t.*,
        COUNT(te.id) as time_entry_count,
        COALESCE(SUM(te.duration), 0) as total_time
      FROM tasks t
      LEFT JOIN time_entries te ON t.id = te.task_id
      WHERE t.project_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    
    const result = await db.query(query, [projectId]);
    return result.rows;
  }
}

export default ProjectModel;
