import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  updateDisappearingSettings,
  deleteConversation,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/', getOrCreateConversation);
router.put('/:id/disappearing', updateDisappearingSettings);
router.delete('/:id', deleteConversation);

export default router;
