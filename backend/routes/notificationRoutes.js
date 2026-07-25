import express from 'express';
import { protect } from '../middleware/auth.js';
import { getMyNotifications, markNotificationsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.put('/read', protect, markNotificationsRead);

export default router;
