import { Router } from 'express';
import { getHealthScore, getInsights, getAnomalies, getRecurring, updateAnomalyStatus } from '../controllers/insightController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);

router.get('/health-score', getHealthScore);
router.get('/', getInsights);
router.get('/anomalies', getAnomalies);
router.patch('/anomalies/:id', updateAnomalyStatus);
router.get('/recurring', getRecurring);

export default router;
