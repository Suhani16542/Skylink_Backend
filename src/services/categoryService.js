import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { slugify } from '../models/Blog.js';

/**
 * Check if MongoDB is currently connected
 */
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Create a new Category
 *
 * @param {Object} categoryData
 * @param {string} categoryData.title
 * @param {string} [categoryData.slug]
 * @param {string} [categoryData.description]
 * @returns {Promise<Object>}
 */
export const createCategory = async ({ title, slug, description = '' }) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const cleanTitle = (title || '').trim();
  const rawSlug = (slug || cleanTitle).trim();
  const cleanSlug = slugify(rawSlug);
  const cleanDescription = (description || '').trim();

  if (!cleanTitle) {
    const error = new Error('Category title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!cleanSlug) {
    const error = new Error('Category slug is required');
    error.statusCode = 400;
    throw error;
  }

  // Check if a category with this slug already exists
  const existingCategory = await Category.findOne({ slug: cleanSlug });
  if (existingCategory) {
    const error = new Error('Category with this slug already exists');
    error.statusCode = 409;
    throw error;
  }

  const category = new Category({
    title: cleanTitle,
    slug: cleanSlug,
    description: cleanDescription,
  });

  return await category.save();
};

/**
 * Get all categories
 *
 * @returns {Promise<Array>}
 */
export const getAllCategories = async () => {
  if (!isDbConnected()) {
    return [];
  }

  return await Category.find({})
    .sort({ createdAt: -1 })
    .select('title slug description createdAt updatedAt')
    .lean();
};

/**
 * Get a single category by slug
 *
 * @param {string} slug
 * @returns {Promise<Object>}
 */
export const getCategoryBySlug = async (slug) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const cleanSlug = slugify(slug || '');
  const category = await Category.findOne({ slug: cleanSlug })
    .select('title slug description createdAt updatedAt')
    .lean();

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  return category;
};

export default {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
};
