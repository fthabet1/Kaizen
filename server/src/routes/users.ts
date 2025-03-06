// server/src/routes/users.ts
import express from 'express';
import { registerUser, getUserProfile, updateUserProfile, getUserSettings, updateUserSettings } from '../controllers/userController';

const router = express.Router();

router.post('/register', registerUser);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/settings', getUserSettings);
router.put('/settings', updateUserSettings);

export default router;