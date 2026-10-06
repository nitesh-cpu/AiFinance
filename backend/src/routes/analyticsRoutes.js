import { Router } from 'express';
import { getOverview, getCategoryBreakdown, getSpendingTrend, getCashFlow } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);

router.get('/overview', getOverview);
router.get('/categories', getCategoryBreakdown);
router.get('/spending-trend', getSpendingTrend);
router.get('/cash-flow', getCashFlow);

export default router;
