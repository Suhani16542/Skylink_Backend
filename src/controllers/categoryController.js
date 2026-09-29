import categoryService from '../services/categoryService.js';

/**
 * @route   POST /api/v1/categories
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin)
 */
export const createCategory = async (req, res, next) => {
  try {
    const { title, slug, description } = req.body;

    if (!title || (typeof title === 'string' && !title.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Category title is required',
      });
    }

    const category = await categoryService.createCategory({
      title,
      slug,
      description,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Category with this slug already exists',
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
 * @route   GET /api/v1/categories
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/categories/:slug
 * @route   GET /api/categories/:slug
 * @desc    Get single category by slug
 * @access  Public
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await categoryService.getCategoryBySlug(slug);

    return res.status(200).json({
      success: true,
      data: category,
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
  createCategory,
  getAllCategories,
  getCategoryBySlug,
};
