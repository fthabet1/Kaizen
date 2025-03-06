// server/src/models/UserModel.ts
import db from '../config/db';
import { User, CreateUserDto } from '../types/index';

class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserDto): Promise<User> {
    const { auth_id, email, name } = userData;
    
    const query = `
      INSERT INTO users (auth_id, email, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await db.query(query, [auth_id, email, name || null]);
    return result.rows[0];
  }

  /**
   * Find user by auth_id (Firebase UID or Auth0 ID)
   */
  static async findByAuthId(authId: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE auth_id = $1`;
    const result = await db.query(query, [authId]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update user profile
   */
  static async update(
    id: number,
    data: { name?: string; email?: string }
  ): Promise<User | null> {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // If no updates, return current user
    if (updates.length === 0) {
      return this.findById(id);
    }

    // Add user id to values array
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Get user with settings
   */
  static async getUserWithSettings(id: number): Promise<any> {
    const query = `
      SELECT 
        u.*,
        us.theme,
        us.hour_format,
        us.week_start,
        us.notification_enabled
      FROM 
        users u
      LEFT JOIN 
        user_settings us ON u.id = us.user_id
      WHERE 
        u.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
}

export default UserModel;
