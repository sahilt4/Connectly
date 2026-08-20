import express from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  uploadAttachment,
  getSharedMedia,
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.post('/', sendMessage);
router.get('/:conversationId', getMessages);
router.get('/conversation/:conversationId/media', getSharedMedia);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/react', reactToMessage);
router.post('/upload', upload.single('file'), uploadAttachment);

export default router;
