import express from 'express';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getConnections,
  getPendingRequests,
} from '../controllers/connectionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/request/:recipientId', sendConnectionRequest);
router.post('/:connectionId/accept', acceptConnectionRequest);
router.post('/:connectionId/reject', rejectConnectionRequest);
router.delete('/:userId', removeConnection);
router.get('/', getConnections);
router.get('/pending', getPendingRequests);

export default router;
