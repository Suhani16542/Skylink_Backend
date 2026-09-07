import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Protect routes - JWT verification middleware
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const secret = process.env.JWT_SECRET || 'skylink_jwt_fallback_secret';
      const decoded = jwt.verify(token, secret);

      // Find admin by id and attach to req (excluding password)
      const admin = await Admin.findById(decoded.id).select('-password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, admin no longer exists',
        });
      }

      req.admin = admin;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid or expired',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided in Authorization header',
    });
  }
};

export default {
  protect,
};
