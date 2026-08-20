import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  clearNotifications,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/', clearNotifications);

export default router;
