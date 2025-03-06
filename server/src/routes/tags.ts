// server/src/routes/tags.ts
import express from 'express';
import { 
  createTag, 
  getTags, 
  getTagById, 
  updateTag, 
  deleteTag
} from '../controllers/tagController';

const router = express.Router();

router.post('/', createTag);
router.get('/', getTags);
router.get('/:id', getTagById);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

export default router;
