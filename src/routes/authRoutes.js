import { Router } from 'express';
import { login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin & return token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current admin profile
 * @access  Private (JWT Protected)
 */
router.get('/me', protect, getMe);

export default router;
