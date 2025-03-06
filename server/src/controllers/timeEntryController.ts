// server/src/controllers/timeEntryController.ts
import { Request, Response } from 'express';
import TimeEntryModel from '../models/timeEntryModel';
import TaskModel from '../models/taskModel';
import { CreateTimeEntryDto, UpdateTimeEntryDto } from '../types';

export const createTimeEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }
    
    const timeEntryData: CreateTimeEntryDto = {
      task_id: req.body.task_id,
      start_time: new Date(req.body.start_time),
      end_time: req.body.end_time ? new Date(req.body.end_time) : undefined,
      duration: req.body.duration,
      description: req.body.description,
    };
    
    // Validate that the task exists and belongs to the user
    const task = await TaskModel.findById(timeEntryData.task_id);
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Check if task belongs to user
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    if (task.user_id !== userIdResult) {
      res.status(403).json({ error: 'Task does not belong to user' });
      return;
    }
    
    // If there's an active time entry, stop it
    const activeEntry = await TimeEntryModel.findActiveByUserId(userIdResult);
    
    if (activeEntry) {
      const now = new Date();
      const duration = Math.floor((now.getTime() - new Date(activeEntry.start_time).getTime()) / 1000);
      
      await TimeEntryModel.update(activeEntry.id, {
        end_time: now,
        duration,
      });
    }
    
    const timeEntry = await TimeEntryModel.create(userIdResult, timeEntryData);
    
    res.status(201).json(timeEntry);
  } catch (error: any) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: error.message || 'Error creating time entry' });
  }
};

export const getTimeEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Parse query parameters
    const taskId = req.query.task_id 
      ? parseInt(req.query.task_id as string) 
      : undefined;
    
    const isActive = req.query.is_active === 'true';
    
    const startDate = req.query.start_date 
      ? new Date(req.query.start_date as string)
      : undefined;
    
    const endDate = req.query.end_date 
      ? new Date(req.query.end_date as string)
      : undefined;
    
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    const timeEntries = await TimeEntryModel.findByUserId(userIdResult, {
      taskId,
      isActive,
      startDate,
      endDate,
    });
    
    res.status(200).json(timeEntries);
  } catch (error: any) {
    console.error('Error getting time entries:', error);
    res.status(500).json({ error: error.message || 'Error getting time entries' });
  }
};

export const getRecentTimeEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    const limit = req.query.limit 
      ? parseInt(req.query.limit as string)
      : 10;
    
    const timeEntries = await TimeEntryModel.findRecentByUserId(userIdResult, limit);
    
    res.status(200).json(timeEntries);
  } catch (error: any) {
    console.error('Error getting recent time entries:', error);
    res.status(500).json({ error: error.message || 'Error getting recent time entries' });
  }
};

export const getTimeEntryById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const entryId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(entryId)) {
      res.status(400).json({ error: 'Invalid time entry ID' });
      return;
    }
    
    const timeEntry = await TimeEntryModel.findById(entryId);
    
    if (!timeEntry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    // Verify that the time entry belongs to the user
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    if (timeEntry.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    res.status(200).json(timeEntry);
  } catch (error: any) {
    console.error('Error getting time entry:', error);
    res.status(500).json({ error: error.message || 'Error getting time entry' });
  }
};

export const updateTimeEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const entryId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(entryId)) {
      res.status(400).json({ error: 'Invalid time entry ID' });
      return;
    }
    
    // Get existing time entry to verify ownership
    const existingEntry = await TimeEntryModel.findById(entryId);
    
    if (!existingEntry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    // Verify that the time entry belongs to the user
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    if (existingEntry.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // If task_id is being updated, verify that the new task belongs to the user
    if (req.body.task_id && req.body.task_id !== existingEntry.task_id) {
      const task = await TaskModel.findById(req.body.task_id);
      
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      if (task.user_id !== userIdResult) {
        res.status(403).json({ error: 'Task does not belong to user' });
        return;
      }
    }
    
    const timeEntryData: UpdateTimeEntryDto = {
      task_id: req.body.task_id,
      start_time: req.body.start_time ? new Date(req.body.start_time) : undefined,
      end_time: req.body.end_time ? new Date(req.body.end_time) : undefined,
      duration: req.body.duration,
      description: req.body.description,
    };
    
    const updatedEntry = await TimeEntryModel.update(entryId, timeEntryData);
    
    res.status(200).json(updatedEntry);
  } catch (error: any) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: error.message || 'Error updating time entry' });
  }
};

export const deleteTimeEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const entryId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(entryId)) {
      res.status(400).json({ error: 'Invalid time entry ID' });
      return;
    }
    
    // Get existing time entry to verify ownership
    const existingEntry = await TimeEntryModel.findById(entryId);
    
    if (!existingEntry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    // Verify that the time entry belongs to the user
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    if (existingEntry.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await TimeEntryModel.delete(entryId);
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: error.message || 'Error deleting time entry' });
  }
};

export const getActiveTimeEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const userIdResult = await TimeEntryModel.getUserIdByAuthId(userId);
    
    const activeEntry = await TimeEntryModel.findActiveByUserId(userIdResult);
    
    res.status(200).json(activeEntry || null);
  } catch (error: any) {
    console.error('Error getting active time entry:', error);
    res.status(500).json({ error: error.message || 'Error getting active time entry' });
  }
};
