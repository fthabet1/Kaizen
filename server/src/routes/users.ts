import express from 'express';
import { registerUser, getUserProfile, updateUserProfile, getUserSettings, updateUserSettings } from '../controllers/userController';

const router = express.Router();

// Log all routes when this module is loaded
console.log('Setting up user routes:');
console.log('- POST /register');
console.log('- GET /profile');
console.log('- PUT /profile');
console.log('- GET /settings');
console.log('- PUT /settings');

router.post('/register', registerUser);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/settings', getUserSettings);
router.put('/settings', updateUserSettings);

export default router;