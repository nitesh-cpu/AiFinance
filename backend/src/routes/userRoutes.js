import { Router } from 'express';
import { updateProfile, updatePreferences, updateNotifications, deleteAccount } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);

router.put('/profile', updateProfile);
router.put('/preferences', updatePreferences);
router.put('/notifications', updateNotifications);
router.delete('/account', deleteAccount);

export default router;
