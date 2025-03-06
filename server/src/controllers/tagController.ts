// server/src/controllers/tagController.ts
import { Request, Response } from 'express';
import TagModel from '../models/tagModel';
import { CreateTagDto } from '../types';

export const createTag = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const tagData: CreateTagDto = {
      name: req.body.name,
      color: req.body.color
    };
    
    // Get user's internal ID
    const userIdResult = await TagModel.getUserIdByAuthId(userId);
    
    const tag = await TagModel.create(userIdResult, tagData);
    
    res.status(201).json(tag);
  } catch (error: any) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: error.message || 'Error creating tag' });
  }
};

export const getTags = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Get user's internal ID
    const userIdResult = await TagModel.getUserIdByAuthId(userId);
    
    const tags = await TagModel.findByUserId(userIdResult);
    
    res.status(200).json(tags);
  } catch (error: any) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: error.message || 'Error getting tags' });
  }
};

export const getTagById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tagId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(tagId)) {
      res.status(400).json({ error: 'Invalid tag ID' });
      return;
    }
    
    const tag = await TagModel.findById(tagId);
    
    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    
    // Verify that the tag belongs to the user
    const userIdResult = await TagModel.getUserIdByAuthId(userId);
    
    if (tag.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    res.status(200).json(tag);
  } catch (error: any) {
    console.error('Error getting tag:', error);
    res.status(500).json({ error: error.message || 'Error getting tag' });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tagId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(tagId)) {
      res.status(400).json({ error: 'Invalid tag ID' });
      return;
    }
    
    // Get existing tag to verify ownership
    const existingTag = await TagModel.findById(tagId);
    
    if (!existingTag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    
    // Verify that the tag belongs to the user
    const userIdResult = await TagModel.getUserIdByAuthId(userId);
    
    if (existingTag.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    const tagData = {
      name: req.body.name,
      color: req.body.color
    };
    
    const updatedTag = await TagModel.update(tagId, tagData);
    
    res.status(200).json(updatedTag);
  } catch (error: any) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: error.message || 'Error updating tag' });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tagId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (isNaN(tagId)) {
      res.status(400).json({ error: 'Invalid tag ID' });
      return;
    }
    
    // Get existing tag to verify ownership
    const existingTag = await TagModel.findById(tagId);
    
    if (!existingTag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    
    // Verify that the tag belongs to the user
    const userIdResult = await TagModel.getUserIdByAuthId(userId);
    
    if (existingTag.user_id !== userIdResult) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    await TagModel.delete(tagId);
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: error.message || 'Error deleting tag' });
  }
};

export const getTasksByTag = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tagId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (isNaN(tagId)) {
      return res.status(400).json({ error: 'Invalid tag ID' });
    }
    
    // Get existing tag to verify ownership
    const existingTag = await TagModel.findById(tagId);
    
    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Verify that the tag belongs to the user
    const userIdResult = await TagModel.getUserIdByAuthId(userId);
    
    if (existingTag.user_id !== userIdResult) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const tasks = await TagModel.getTasksByTagId(tagId);
    
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Error getting tasks by tag:', error);
    res.status(500).json({ error: error.message || 'Error getting tasks by tag' });
  }
};
