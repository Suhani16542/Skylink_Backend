import { Router } from 'express';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health-check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Skylink Backend API is running',
  });
});

export default router;
