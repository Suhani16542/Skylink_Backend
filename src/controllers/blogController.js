import blogService from '../services/blogService.js';

/**
 * @route   GET /api/blogs
 * @desc    Get published blogs with filtering & pagination
 * @access  Public
 */
export const getPublicBlogs = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      category,
      technology,
      keyword,
      tag,
      search,
      featured,
    } = req.query;

    const result = await blogService.getPublicBlogs({
      page,
      limit,
      category,
      technology,
      keyword,
      tag,
      search,
      featured,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/blogs/:slug
 * @desc    Get single published blog by slug
 * @access  Public
 */
export const getBlogBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const blog = await blogService.getBlogBySlug(slug);

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog post
 * @access  Private (Admin)
 */
export const createBlog = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      shortDescription,
      excerpt,
      content,
      featuredImage,
      featuredImagePublicId,
      imageAltText,
      category,
      technology,
      keywords,
      tags,
      author,
      authorName,
      estimatedReadTime,
      status,
      featured,
    } = req.body;

    const description = shortDescription || excerpt;

    if (!title || !description || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, shortDescription (or excerpt), content, and category are required.',
      });
    }

    const newBlog = await blogService.createBlog({
      title,
      slug,
      shortDescription: description,
      content,
      featuredImage,
      featuredImagePublicId,
      imageAltText,
      category,
      technology,
      keywords,
      tags,
      author: author || authorName || 'Skylink Team',
      estimatedReadTime,
      status: status || 'draft',
      featured: featured || false,
    });

    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: newBlog,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A blog with this slug already exists.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/blogs/admin
 * @desc    Get all blogs (drafts + published) for Admin dashboard
 * @access  Private (Admin)
 */
export const getAdminBlogs = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      category,
      technology,
      tag,
      status,
      featured,
    } = req.query;

    const result = await blogService.getAdminBlogs({
      page,
      limit,
      search,
      category,
      technology,
      tag,
      status,
      featured,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/blogs/admin/:id
 * @desc    Get single blog by ID for Admin editing
 * @access  Private (Admin)
 */
export const getAdminBlogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await blogService.getBlogById(id);

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/blogs/:id
 * @desc    Update an existing blog post
 * @access  Private (Admin)
 */
export const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const updatedBlog = await blogService.updateBlog(id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PATCH /api/blogs/:id/status
 * @desc    Publish or unpublish a blog
 * @access  Private (Admin)
 */
export const updateBlogStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required ('draft' or 'published')",
      });
    }

    const updatedBlog = await blogService.updateBlogStatus(id, status);

    return res.status(200).json({
      success: true,
      message: `Blog status updated to ${status}`,
      data: updatedBlog,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PATCH /api/blogs/:id/featured
 * @desc    Toggle blog featured status
 * @access  Private (Admin)
 */
export const updateBlogFeatured = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    if (typeof featured === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Featured boolean value is required',
      });
    }

    const updatedBlog = await blogService.updateBlogFeatured(id, featured);

    return res.status(200).json({
      success: true,
      message: `Blog featured status updated to ${featured}`,
      data: updatedBlog,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   DELETE /api/blogs/:id
 * @desc    Delete a blog and its Cloudinary media
 * @access  Private (Admin)
 */
export const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await blogService.deleteBlog(id);

    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/blogs/upload-image
 * @desc    Upload an image for a blog to Cloudinary
 * @access  Private (Admin)
 */
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file (JPG, PNG, WEBP).',
      });
    }

    const result = await blogService.uploadBlogImage(req.file.buffer);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export default {
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
};
