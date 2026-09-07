import { Router } from 'express';
import {
  submit,
  getSubmissions,
  getSubmissionById,
  deleteSubmission,
  updateStatus,
} from '../controllers/formController.js';
import { protect } from '../middleware/authMiddleware.js';
import { formRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateFormSubmission } from '../middleware/formValidation.js';

const router = Router();

// ==========================================
// 1. Public Form Submission Endpoint
// ==========================================
router.post('/submit', formRateLimiter, validateFormSubmission, submit);

// ==========================================
// 2. Admin Protected Endpoints (JWT Required)
// ==========================================
router.get('/submissions', protect, getSubmissions);
router.get('/submissions/:id', protect, getSubmissionById);
router.delete('/submissions/:id', protect, deleteSubmission);
router.patch('/submissions/:id/status', protect, updateStatus);

export default router;
