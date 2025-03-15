import db from '../config/db';
import { Tag, CreateTagDto } from '../types';

class TagModel {
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
   * Create a new tag
   */
  static async create(userId: number, tagData: CreateTagDto): Promise<Tag> {
    const { name, color } = tagData;
    
    const query = `
      INSERT INTO tags (user_id, name, color)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      userId, 
      name, 
      color || '#10B981'
    ]);
    
    return result.rows[0];
  }

  /**
   * Find all tags for a user
   */
  static async findByUserId(userId: number): Promise<Tag[]> {
    const query = `
      SELECT * FROM tags
      WHERE user_id = $1
      ORDER BY name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Find a tag by ID
   */
  static async findById(id: number): Promise<Tag | null> {
    const query = 'SELECT * FROM tags WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update a tag
   */
  static async update(
    id: number, 
    data: { name?: string; color?: string }
  ): Promise<Tag> {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(data.color);
      paramIndex++;
    }

    // If no updates, return current tag
    if (values.length === 0) {
      return this.findById(id) as Promise<Tag>;
    }

    // Add tag id to values array
    values.push(id);

    const query = `
      UPDATE tags
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a tag
   */
  static async delete(id: number): Promise<void> {
    // This will also remove associations in the join table
    const query = 'DELETE FROM tags WHERE id = $1';
    await db.query(query, [id]);
  }

  /**
   * Get tasks associated with a tag
   */
  static async getTasksByTagId(tagId: number): Promise<any[]> {
    const query = `
      SELECT 
        t.*,
        p.name as project_name,
        p.color as project_color
      FROM tasks t
      JOIN task_tags tt ON t.id = tt.task_id
      JOIN projects p ON t.project_id = p.id
      WHERE tt.tag_id = $1
      ORDER BY t.created_at DESC
    `;
    
    const result = await db.query(query, [tagId]);
    return result.rows;
  }

  /**
   * Add a tag to a task
   */
  static async addTagToTask(taskId: number, tagId: number): Promise<void> {
    const query = `
      INSERT INTO task_tags (task_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (task_id, tag_id) DO NOTHING
    `;
    
    await db.query(query, [taskId, tagId]);
  }

  /**
   * Remove a tag from a task
   */
  static async removeTagFromTask(taskId: number, tagId: number): Promise<void> {
    const query = `
      DELETE FROM task_tags
      WHERE task_id = $1 AND tag_id = $2
    `;
    
    await db.query(query, [taskId, tagId]);
  }

  /**
   * Get tags for a task
   */
  static async getTagsForTask(taskId: number): Promise<Tag[]> {
    const query = `
      SELECT t.*
      FROM tags t
      JOIN task_tags tt ON t.id = tt.tag_id
      WHERE tt.task_id = $1
      ORDER BY t.name
    `;
    
    const result = await db.query(query, [taskId]);
    return result.rows;
  }

  /**
   * Get tags with usage counts
   */
  static async getTagsWithCounts(userId: number): Promise<any[]> {
    const query = `
      SELECT 
        t.*,
        COUNT(tt.task_id) as task_count
      FROM tags t
      LEFT JOIN task_tags tt ON t.id = tt.tag_id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY task_count DESC, t.name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

export default TagModel;
