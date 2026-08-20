import express from 'express';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
} from '../controllers/safetyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/block', blockUser);
router.post('/unblock', unblockUser);
router.get('/blocked', getBlockedUsers);
router.post('/report', reportUser);

export default router;
