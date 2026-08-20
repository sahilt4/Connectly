import express from 'express';
import { logCall, getCallHistory } from '../controllers/callController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/log', logCall);
router.get('/history', getCallHistory);

export default router;
