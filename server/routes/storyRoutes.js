import express from 'express';
import {
  createStory,
  getStoriesFeed,
  viewStory,
  reactToStory,
  replyToStory,
  deleteStory,
} from '../controllers/storyController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.post('/', upload.single('media'), createStory);
router.get('/feed', getStoriesFeed);
router.post('/:id/view', viewStory);
router.post('/:id/react', reactToStory);
router.post('/:id/reply', replyToStory);
router.delete('/:id', deleteStory);

export default router;
