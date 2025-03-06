// server/src/controllers/projectController.ts
import { Request, Response, RequestHandler } from 'express';
import ProjectModel from '../models/projectModel';
import { CreateProjectDto, UpdateProjectDto } from '../types';

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const projectData: CreateProjectDto = {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color
    };
    
    const project = await ProjectModel.create(userId, projectData);
    
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Error creating project' });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Parse query parameters
    const isActive = req.query.is_active !== undefined 
      ? req.query.is_active === 'true' 
      : undefined;
    
    const projects = await ProjectModel.findByUserId(userId, { isActive });
    
    res.status(200).json(projects);
  } catch (error: any) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: error.message || 'Error getting projects' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const projectId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    
    const project = await ProjectModel.findById(projectId);
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Verify that the project belongs to the user
    if (project.user_id.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    res.status(200).json(project);
  } catch (error: any) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: error.message || 'Error getting project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const projectId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    
    // Get existing project to verify ownership
    const existingProject = await ProjectModel.findById(projectId);
    
    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Verify that the project belongs to the user
    if (existingProject.user_id.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const projectData: UpdateProjectDto = {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
      is_active: req.body.is_active
    };
    
    const updatedProject = await ProjectModel.update(projectId, projectData);
    
    res.status(200).json(updatedProject);
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Error updating project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const projectId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    
    // Get existing project to verify ownership
    const existingProject = await ProjectModel.findById(projectId);
    
    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Verify that the project belongs to the user
    if (existingProject.user_id.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await ProjectModel.delete(projectId);
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Error deleting project' });
  }
};

export const getProjectStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const projectId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    
    // Get existing project to verify ownership
    const existingProject = await ProjectModel.findById(projectId);
    
    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Verify that the project belongs to the user
    if (existingProject.user_id.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // Get start and end dates from query params if provided
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    
    const stats = await ProjectModel.getProjectStats(projectId, startDate, endDate);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error getting project stats:', error);
    res.status(500).json({ error: error.message || 'Error getting project stats' });
  }
};
