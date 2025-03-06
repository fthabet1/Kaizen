// server/src/controllers/userController.ts
import { Request, Response } from 'express';
import UserModel from '../models/userModel';
import { CreateUserDto } from '../types';

export const registerUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if user already exists
    const existingUser = await UserModel.findByAuthId(userId);
    
    if (existingUser) {
      // User already exists, return it
      res.status(200).json(existingUser);
      return;
    }
    
    // Create new user
    const userData: CreateUserDto = {
      auth_id: userId,
      email: req.body.email,
      name: req.body.name
    };
    
    const newUser = await UserModel.create(userData);
    
    // Create default settings for the user
    await createDefaultSettings(newUser.id);
    
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message || 'Error registering user' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const user = await UserModel.findByAuthId(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
  
    res.status(200).json(user);
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: error.message || 'Error getting user profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const user = await UserModel.findByAuthId(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const updatedUser = await UserModel.update(user.id, {
      name: req.body.name,
      email: req.body.email // Note: This won't update the auth provider's email
    });
    
    res.status(200).json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message || 'Error updating user profile' });
  }
};

export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const user = await UserModel.findByAuthId(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const userWithSettings = await UserModel.getUserWithSettings(user.id);
    
    if (!userWithSettings) {
      // Create default settings if none exist
      await createDefaultSettings(user.id);
      const newUserWithSettings = await UserModel.getUserWithSettings(user.id);
      
      res.status(200).json({
        theme: newUserWithSettings.theme,
        hour_format: newUserWithSettings.hour_format,
        week_start: newUserWithSettings.week_start,
        notification_enabled: newUserWithSettings.notification_enabled
      });
      return;
    }
    
    res.status(200).json({
      theme: userWithSettings.theme,
      hour_format: userWithSettings.hour_format,
      week_start: userWithSettings.week_start,
      notification_enabled: userWithSettings.notification_enabled
    });
  } catch (error: any) {
    console.error('Error getting user settings:', error);
    res.status(500).json({ error: error.message || 'Error getting user settings' });
  }
};

export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const user = await UserModel.findByAuthId(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return
    }
    
    // Check if settings exist
    const userWithSettings = await UserModel.getUserWithSettings(user.id);
    
    if (!userWithSettings.theme) {
      // Create default settings if none exist
      await createDefaultSettings(user.id);
    }
    
    // Update settings
    await updateSettings(user.id, {
      theme: req.body.theme,
      hour_format: req.body.hour_format,
      week_start: req.body.week_start,
      notification_enabled: req.body.notification_enabled
    });
    
    const updatedUserWithSettings = await UserModel.getUserWithSettings(user.id);
    
    res.status(200).json({
      theme: updatedUserWithSettings.theme,
      hour_format: updatedUserWithSettings.hour_format,
      week_start: updatedUserWithSettings.week_start,
      notification_enabled: updatedUserWithSettings.notification_enabled
    });
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: error.message || 'Error updating user settings' });
  }
};

// Helper function to create default settings
const createDefaultSettings = async (userId: number) => {
  const query = `
    INSERT INTO user_settings (user_id, theme, hour_format, week_start, notification_enabled)
    VALUES ($1, 'light', '24h', 1, true)
    ON CONFLICT (user_id) DO NOTHING
  `;
  
  try {
    await db.query(query, [userId]);
  } catch (error) {
    console.error('Error creating default settings:', error);
    throw error;
  }
};

// Helper function to update settings
const updateSettings = async (
  userId: number, 
  settings: {
    theme?: string;
    hour_format?: string;
    week_start?: number;
    notification_enabled?: boolean;
  }
) => {
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (settings.theme !== undefined) {
    updates.push(`theme = $${paramIndex}`);
    values.push(settings.theme);
    paramIndex++;
  }

  if (settings.hour_format !== undefined) {
    updates.push(`hour_format = $${paramIndex}`);
    values.push(settings.hour_format);
    paramIndex++;
  }

  if (settings.week_start !== undefined) {
    updates.push(`week_start = $${paramIndex}`);
    values.push(settings.week_start);
    paramIndex++;
  }

  if (settings.notification_enabled !== undefined) {
    updates.push(`notification_enabled = $${paramIndex}`);
    values.push(settings.notification_enabled);
    paramIndex++;
  }

  // Add updated_at timestamp
  updates.push(`updated_at = NOW()`);

  // If no updates, return
  if (values.length === 0) {
    return;
  }

  // Add user id to values array
  values.push(userId);

  const query = `
    UPDATE user_settings
    SET ${updates.join(', ')}
    WHERE user_id = $${paramIndex}
  `;

  try {
    await db.query(query, values);
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

// Import the database client for queries
import db from '../config/db';
