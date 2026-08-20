import express from 'express';
import {
  searchUsers,
  getUserProfile,
  getUserByPublicId,
  updateProfile,
  toggleCloseFriend,
  changePassword,
  updatePrivacySettings,
  uploadAvatar,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/search', searchUsers);
router.get('/qr/:publicId', getUserByPublicId);
router.get('/:id', getUserProfile);
router.put('/profile', updateProfile);
router.post('/close-friends/:userId', toggleCloseFriend);
router.put('/change-password', changePassword);
router.put('/privacy', updatePrivacySettings);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
