// server/src/routes/timeEntries.ts
import express from 'express';
import { 
  createTimeEntry, 
  getTimeEntries, 
  getTimeEntryById, 
  updateTimeEntry, 
  deleteTimeEntry,
  getActiveTimeEntry,
  getRecentTimeEntries
} from '../controllers/timeEntryController';

const router = express.Router();

router.post('/', createTimeEntry);
router.get('/', getTimeEntries);
router.get('/active', getActiveTimeEntry);
router.get('/recent', getRecentTimeEntries);
router.get('/:id', getTimeEntryById);
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

export default router;