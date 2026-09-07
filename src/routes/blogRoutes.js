import { Router } from 'express';
import {
  getPublicBlogs,
  getBlogBySlug,
  createBlog,
  getAdminBlogs,
  getAdminBlogById,
  updateBlog,
  updateBlogStatus,
  updateBlogFeatured,
  deleteBlog,
  uploadImage,
} from '../controllers/blogController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

// ==========================================
// 1. Admin Specific Routes (Must come before dynamic :id / :slug)
// ==========================================

// Image Upload Endpoint
router.post('/upload-image', protect, upload.single('image'), uploadImage);

// Admin List All Blogs (drafts + published)
router.get('/admin', protect, getAdminBlogs);

// Admin Get Single Blog By ID (for editing)
router.get('/admin/:id', protect, getAdminBlogById);

// Create Blog
router.post('/', protect, createBlog);

// Update Status (publish / unpublish)
router.patch('/:id/status', protect, updateBlogStatus);

// Update Featured Flag
router.patch('/:id/featured', protect, updateBlogFeatured);

// Update Blog
router.put('/:id', protect, updateBlog);

// Delete Blog
router.delete('/:id', protect, deleteBlog);

// ==========================================
// 2. Public Routes
// ==========================================

// Get published blogs with filters & pagination
router.get('/', getPublicBlogs);

// Get single published blog by slug
router.get('/:slug', getBlogBySlug);

export default router;
