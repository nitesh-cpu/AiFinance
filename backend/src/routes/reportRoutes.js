import { Router } from 'express';
import { getMonthlyReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);

router.get('/monthly', getMonthlyReport);

export default router;
