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

  // Normalize author
  if (typeof normalized.author === 'string') {
    normalized.author = {
      name: normalized.author.trim() || normalized.authorName?.trim() || 'Skylink Team',
      role: 'EXIM & Logistics Specialist',
      avatar: '',
    };
  } else if (normalized.author && typeof normalized.author === 'object') {
    normalized.author = {
      name: (normalized.author.name || normalized.authorName || 'Skylink Team').trim(),
      role: (normalized.author.role || 'EXIM & Logistics Specialist').trim(),
      avatar: (normalized.author.avatar || '').trim(),
    };
  } else if (normalized.authorName) {
    normalized.author = {
      name: normalized.authorName.trim(),
      role: 'EXIM & Logistics Specialist',
      avatar: '',
    };
  } else if (!normalized.author) {
    normalized.author = {
      name: 'Skylink Team',
      role: 'EXIM & Logistics Specialist',
      avatar: '',
    };
  }

  // Normalize status (supports 'Published', 'Draft', 'published', 'draft', etc.)
  if (typeof normalized.status === 'string') {
    const s = normalized.status.toLowerCase().trim();
    if (s === 'published' || s === 'publish') {
      normalized.status = 'published';
    } else {
      normalized.status = 'draft';
    }
  } else if (!normalized.status) {
    normalized.status = 'draft';
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

  // Normalize images array
  if (Array.isArray(normalized.images)) {
    normalized.images = normalized.images
      .map((img) => {
        if (typeof img === 'string') {
          return {
            url: img.trim(),
            alt: normalized.imageAltText || '',
            publicId: '',
          };
        } else if (img && typeof img === 'object') {
          return {
            url: (img.url || '').trim(),
            alt: (img.alt || normalized.imageAltText || '').trim(),
            publicId: (img.publicId || '').trim(),
          };
        }
        return null;
      })
      .filter((img) => img && img.url);

    // If featuredImage is not provided, use the first image from images array
    if ((!normalized.featuredImage || !normalized.featuredImage.url) && normalized.images.length > 0) {
      normalized.featuredImage = {
        url: normalized.images[0].url,
        publicId: normalized.images[0].publicId || '',
      };
      if (!normalized.featuredImagePublicId && normalized.images[0].publicId) {
        normalized.featuredImagePublicId = normalized.images[0].publicId;
      }
    }
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

  // If images array is empty or not provided but featuredImage exists, populate images
  if ((!Array.isArray(normalized.images) || normalized.images.length === 0) && normalized.featuredImage?.url) {
    normalized.images = [
      {
        url: normalized.featuredImage.url,
        alt: normalized.imageAltText || '',
        publicId: normalized.featuredImage.publicId || normalized.featuredImagePublicId || '',
      },
    ];
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
      { 'author.name': searchRegex },
      { 'author.role': searchRegex },
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

  if (status) {
    const s = status.toLowerCase().trim();
    if (['draft', 'published'].includes(s)) {
      query.status = s;
    }
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
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase().trim() : '';

  if (!['draft', 'published'].includes(normalizedStatus)) {
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

  const updateFields = { status: normalizedStatus };
  if (normalizedStatus === 'published' && !existingBlog.publishedAt) {
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

  // Remove all images from Cloudinary if public IDs exist
  const publicIds = new Set();
  if (blog.featuredImage?.publicId) publicIds.add(blog.featuredImage.publicId);
  if (blog.featuredImagePublicId) publicIds.add(blog.featuredImagePublicId);
  if (Array.isArray(blog.images)) {
    blog.images.forEach((img) => {
      if (img.publicId) publicIds.add(img.publicId);
    });
  }

  for (const pid of publicIds) {
    await deleteImageFromCloudinary(pid);
  }

  await Blog.findByIdAndDelete(id);

  return { success: true, message: 'Blog deleted successfully' };
};

/**
 * Upload single or multiple image buffers to Cloudinary
 *
 * @param {Buffer|Buffer[]} fileBuffers
 * @returns {Promise<{ url: string, publicId: string, imageUrl: string, secure_url: string, images: string[], imageData: Array<{ url: string, publicId: string }> }>}
 */
export const uploadBlogImages = async (fileBuffers) => {
  const buffers = Array.isArray(fileBuffers) ? fileBuffers : [fileBuffers];

  if (buffers.length === 0 || !buffers[0]) {
    const error = new Error('No image file provided');
    error.statusCode = 400;
    throw error;
  }

  const uploadPromises = buffers.map((buf) => uploadImageToCloudinary(buf, 'skylink/blogs'));
  const results = await Promise.all(uploadPromises);

  const images = results.map((r) => r.url);
  const imageData = results.map((r) => ({
    url: r.url,
    publicId: r.publicId,
  }));

  return {
    url: results[0].url,
    publicId: results[0].publicId,
    imageUrl: results[0].url,
    secure_url: results[0].url,
    images,
    imageData,
  };
};

/**
 * Upload single image buffer to Cloudinary (for backward compatibility)
 */
export const uploadBlogImage = async (fileBuffer) => {
  return await uploadBlogImages(fileBuffer);
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
  uploadBlogImages,
};
