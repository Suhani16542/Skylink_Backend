import mongoose from 'mongoose';
import Blog, { slugify, calculateReadingTime } from '../models/Blog.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../config/cloudinary.js';

/**
 * Check if MongoDB is currently connected
 */
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Helper to normalize array fields that might be passed as comma-separated strings or arrays
 */
const normalizeArray = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(input).trim()];
};

/**
 * Helper to normalize incoming blog payload
 */
const normalizeBlogPayload = (payload) => {
  const normalized = { ...payload };

  // Support 'excerpt' as alias for 'shortDescription'
  if (!normalized.shortDescription && normalized.excerpt) {
    normalized.shortDescription = normalized.excerpt;
  }

  // Support 'authorName' as alias for 'author'
  if (!normalized.author && normalized.authorName) {
    normalized.author = normalized.authorName;
  }

  // Normalize arrays
  if (typeof normalized.technology !== 'undefined') {
    normalized.technology = normalizeArray(normalized.technology);
  }
  if (typeof normalized.keywords !== 'undefined') {
    normalized.keywords = normalizeArray(normalized.keywords);
  }
  if (typeof normalized.tags !== 'undefined') {
    normalized.tags = normalizeArray(normalized.tags);
  }

  // Normalize featuredImage if passed as string URL
  if (typeof normalized.featuredImage === 'string') {
    normalized.featuredImage = {
      url: normalized.featuredImage,
      publicId: normalized.featuredImagePublicId || '',
    };
  } else if (normalized.featuredImage && typeof normalized.featuredImage === 'object') {
    if (normalized.featuredImagePublicId && !normalized.featuredImage.publicId) {
      normalized.featuredImage.publicId = normalized.featuredImagePublicId;
    }
  }

  // Sync featuredImagePublicId if publicId is in featuredImage
  if (normalized.featuredImage?.publicId && !normalized.featuredImagePublicId) {
    normalized.featuredImagePublicId = normalized.featuredImage.publicId;
  }

  // Calculate estimated reading time if content is provided and reading time is not
  if (!normalized.estimatedReadTime && normalized.content) {
    normalized.estimatedReadTime = calculateReadingTime(normalized.content);
  }

  return normalized;
};

/**
 * Ensure a unique slug by appending counter if collision exists
 */
const generateUniqueSlug = async (rawSlug, excludeId = null) => {
  let baseSlug = slugify(rawSlug);
  let uniqueSlug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug: uniqueSlug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const exists = await Blog.findOne(query);
    if (!exists) {
      break;
    }

    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

/**
 * Create a new blog post
 */
export const createBlog = async (blogData) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const normalized = normalizeBlogPayload(blogData);
  const { title, slug } = normalized;

  const resolvedSlug = await generateUniqueSlug(slug || title);

  const newBlog = new Blog({
    ...normalized,
    slug: resolvedSlug,
    publishedAt: normalized.status === 'published' ? (normalized.publishedAt || new Date()) : null,
  });

  return await newBlog.save();
};

/**
 * Get published blogs for public consumption
 */
export const getPublicBlogs = async ({
  page = 1,
  limit = 10,
  category,
  technology,
  keyword,
  tag,
  search,
  featured,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  if (!isDbConnected()) {
    return {
      data: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const skip = (pageNum - 1) * limitNum;
  const query = { status: 'published' };

  if (category) {
    query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
  }

  if (technology) {
    query.technology = { $in: [new RegExp(technology.trim(), 'i')] };
  }

  if (keyword) {
    query.keywords = { $in: [new RegExp(keyword.trim(), 'i')] };
  }

  if (tag) {
    query.tags = { $in: [new RegExp(tag.trim(), 'i')] };
  }

  if (typeof featured !== 'undefined') {
    query.featured = featured === 'true' || featured === true;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: searchRegex },
      { shortDescription: searchRegex },
      { category: searchRegex },
      { technology: searchRegex },
      { keywords: searchRegex },
      { tags: searchRegex },
      { author: searchRegex },
    ];
  }

  const [data, total] = await Promise.all([
    Blog.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Blog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Get a single published blog by slug
 */
export const getBlogBySlug = async (slug) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const blog = await Blog.findOne({
    slug: slug.toLowerCase().trim(),
    status: 'published',
  });

  if (!blog) {
    const error = new Error('Blog article not found');
    error.statusCode = 404;
    throw error;
  }

  return blog;
};

/**
 * Get all blogs (including drafts) for Admin dashboard
 */
export const getAdminBlogs = async ({
  page = 1,
  limit = 10,
  search,
  category,
  technology,
  tag,
  status,
  featured,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  if (!isDbConnected()) {
    return {
      data: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const skip = (pageNum - 1) * limitNum;
  const query = {};

  if (status && ['draft', 'published'].includes(status)) {
    query.status = status;
  }

  if (category) {
    query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
  }

  if (technology) {
    query.technology = { $in: [new RegExp(technology.trim(), 'i')] };
  }

  if (tag) {
    query.tags = { $in: [new RegExp(tag.trim(), 'i')] };
  }

  if (typeof featured !== 'undefined') {
    query.featured = featured === 'true' || featured === true;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: searchRegex },
      { slug: searchRegex },
      { shortDescription: searchRegex },
      { category: searchRegex },
      { technology: searchRegex },
      { keywords: searchRegex },
      { tags: searchRegex },
      { author: searchRegex },
    ];
  }

  const [data, total] = await Promise.all([
    Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Blog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Get single blog by ID for Admin editing
 */
export const getBlogById = async (id) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const blog = await Blog.findById(id);

  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  return blog;
};

/**
 * Update an existing blog
 */
export const updateBlog = async (id, updateData) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const existingBlog = await Blog.findById(id);

  if (!existingBlog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  const normalized = normalizeBlogPayload(updateData);

  // Handle unique slug update if title or slug has changed
  if (normalized.slug || normalized.title) {
    const targetSlug = normalized.slug || normalized.title;
    normalized.slug = await generateUniqueSlug(targetSlug, id);
  }

  // Handle status and publishedAt transitions
  if (normalized.status === 'published' && !existingBlog.publishedAt) {
    normalized.publishedAt = new Date();
  }

  // Clean up old Cloudinary image if new one is set
  const oldPublicId = existingBlog.featuredImage?.publicId || existingBlog.featuredImagePublicId;
  const newPublicId = normalized.featuredImage?.publicId || normalized.featuredImagePublicId;

  if (newPublicId && oldPublicId && newPublicId !== oldPublicId) {
    await deleteImageFromCloudinary(oldPublicId);
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    id,
    { $set: normalized },
    { new: true, runValidators: true }
  );

  return updatedBlog;
};

/**
 * Update blog status (publish / unpublish)
 */
export const updateBlogStatus = async (id, status) => {
  if (!['draft', 'published'].includes(status)) {
    const error = new Error("Invalid status. Must be 'draft' or 'published'");
    error.statusCode = 400;
    throw error;
  }

  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const existingBlog = await Blog.findById(id);
  if (!existingBlog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  const updateFields = { status };
  if (status === 'published' && !existingBlog.publishedAt) {
    updateFields.publishedAt = new Date();
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return updatedBlog;
};

/**
 * Update blog featured flag
 */
export const updateBlogFeatured = async (id, featured) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const isFeatured = featured === true || featured === 'true';

  const updatedBlog = await Blog.findByIdAndUpdate(
    id,
    { $set: { featured: isFeatured } },
    { new: true, runValidators: true }
  );

  if (!updatedBlog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  return updatedBlog;
};

/**
 * Delete blog and delete associated Cloudinary image
 */
export const deleteBlog = async (id) => {
  if (!isDbConnected()) {
    const error = new Error('Database is not connected. Please verify MONGODB_URI in your .env file.');
    error.statusCode = 503;
    throw error;
  }

  const blog = await Blog.findById(id);

  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  // Remove image from Cloudinary if it exists
  const publicId = blog.featuredImage?.publicId || blog.featuredImagePublicId;
  if (publicId) {
    await deleteImageFromCloudinary(publicId);
  }

  await Blog.findByIdAndDelete(id);

  return { success: true, message: 'Blog deleted successfully' };
};

/**
 * Upload image buffer to Cloudinary
 */
export const uploadBlogImage = async (fileBuffer) => {
  if (!fileBuffer) {
    const error = new Error('No image file provided');
    error.statusCode = 400;
    throw error;
  }

  return await uploadImageToCloudinary(fileBuffer, 'skylink/blogs');
};

export default {
  createBlog,
  getPublicBlogs,
  getBlogBySlug,
  getAdminBlogs,
  getBlogById,
  updateBlog,
  updateBlogStatus,
  updateBlogFeatured,
  deleteBlog,
  uploadBlogImage,
};
