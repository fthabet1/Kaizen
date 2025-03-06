// server/src/controllers/taskController.ts
import { Request, Response } from 'express';
import TaskModel from '../models/taskModel';
import ProjectModel from '../models/projectModel';
import { CreateTaskDto, UpdateTaskDto } from '../types';

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const taskData: CreateTaskDto = {
      project_id: req.body.project_id,
      name: req.body.name,
      description: req.body.description
    };
    
    // Validate that the project exists and belongs to the user
    const project = await ProjectModel.findById(taskData.project_id);
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return
    }
    
    // Check if project belongs to user
    const userResult = await TaskModel.getUserIdByAuthId(userId);
    
    if (project.user_id !== userResult) {
      res.status(403).json({ error: 'Project does not belong to user' });
      return;
    }
    
    const task = await TaskModel.create(userResult, taskData);
    
    res.status(201).json(task);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message || 'Error creating task' });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Parse query parameters
    const projectId = req.query.project_id 
      ? parseInt(req.query.project_id as string) 
      : undefined;
    
    const isCompleted = req.query.is_completed !== undefined 
      ? req.query.is_completed === 'true' 
      : undefined;
    
    const searchTerm = req.query.search as string | undefined;
    
    const userIdResult = await TaskModel.getUserIdByAuthId(userId);
    
    const tasks = await TaskModel.findByUserId(userIdResult, {
      projectId,
      isCompleted,
      searchTerm
    });
    
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: error.message || 'Error getting tasks' });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }
    
    const task = await TaskModel.findById(taskId);
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Verify that the task belongs to the user
    const userIdResult = await TaskModel.getUserIdByAuthId(userId);
    
    if (task.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    res.status(200).json(task);
  } catch (error: any) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: error.message || 'Error getting task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }
    
    // Get existing task to verify ownership
    const existingTask = await TaskModel.findById(taskId);
    
    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Verify that the task belongs to the user
    const userIdResult = await TaskModel.getUserIdByAuthId(userId);
    
    if (existingTask.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // If project_id is being updated, verify that the new project belongs to the user
    if (req.body.project_id && req.body.project_id !== existingTask.project_id) {
      const project = await ProjectModel.findById(req.body.project_id);
      
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      
      if (project.user_id !== userIdResult) {
        res.status(403).json({ error: 'Project does not belong to user' });
        return;
      }
    }
    
    const taskData: UpdateTaskDto = {
      project_id: req.body.project_id,
      name: req.body.name,
      description: req.body.description,
      is_completed: req.body.is_completed
    };
    
    const updatedTask = await TaskModel.update(taskId, taskData);
    
    res.status(200).json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Error updating task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }
    
    // Get existing task to verify ownership
    const existingTask = await TaskModel.findById(taskId);
    
    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Verify that the task belongs to the user
    const userIdResult = await TaskModel.getUserIdByAuthId(userId);
    
    if (existingTask.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await TaskModel.delete(taskId);
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message || 'Error deleting task' });
  }
};

export const getTaskStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }
    
    // Get existing task to verify ownership
    const existingTask = await TaskModel.findById(taskId);
    
    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Verify that the task belongs to the user
    const userIdResult = await TaskModel.getUserIdByAuthId(userId);
    
    if (existingTask.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // Get start and end dates from query params if provided
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    
    const stats = await TaskModel.getTaskStats(taskId, startDate, endDate);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error getting task stats:', error);
    res.status(500).json({ error: error.message || 'Error getting task stats' });
  }
};
