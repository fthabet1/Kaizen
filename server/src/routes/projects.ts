// server/src/routes/projects.ts
import express from 'express';
import * as projectController from '../controllers/projectController';

const router = express.Router();

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/stats', projectController.getProjectStats);

export default router;