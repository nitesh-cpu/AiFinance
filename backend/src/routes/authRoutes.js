import { Router } from 'express';
import { register, login, getMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authRateLimit } from '../middleware/authRateLimit.js';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

export default router;
