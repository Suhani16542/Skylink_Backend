import { Router } from 'express';
import {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// ==========================================
// Category Endpoints
// ==========================================

// Create new category (Admin Protected)
router.post('/', protect, createCategory);

// Get all categories (Public / Dashboard)
router.get('/', getAllCategories);

// Get single category by slug (Public)
router.get('/:slug', getCategoryBySlug);

export default router;
