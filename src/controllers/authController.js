import { loginAdmin } from '../services/authService.js';

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin & return JWT token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = typeof email === 'string' ? email.trim() : email;
    const cleanPassword = typeof password === 'string' ? password.trim() : password;

    const result = await loginAdmin(cleanEmail, cleanPassword);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
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
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated admin profile
 * @access  Private (Protected by JWT)
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        admin: req.admin,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  getMe,
};
