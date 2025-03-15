import express from 'express';
import { 
  getUserStats, 
  getProductivityTrends, 
  getComparisonStats,
  getProjectDistribution,
  getDailyPatterns
} from '../controllers/statsController';

const router = express.Router();

router.get('/', getUserStats);
router.get('/trends', getProductivityTrends);
router.get('/comparison', getComparisonStats);
router.get('/projects', getProjectDistribution);
router.get('/patterns', getDailyPatterns);

export default router;