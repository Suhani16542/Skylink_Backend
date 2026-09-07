import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Generate JWT token for an admin
 *
 * @param {Object} payload - Data to embed in token
 * @returns {string} Signed JWT token
 */
export const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'skylink_jwt_fallback_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Authenticate admin by email and password
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, admin: Object }>}
 */
export const loginAdmin = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Please provide both email and password');
    error.statusCode = 400;
    throw error;
  }

  // Find admin by email
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

  if (!admin) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Verify password using bcrypt method on Admin model
  const isMatch = await admin.comparePassword(password);

  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token
  const token = generateToken({
    id: admin._id,
    email: admin.email,
  });

  return {
    token,
    admin: {
      id: admin._id,
      email: admin.email,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    },
  };
};

/**
 * Get admin profile by ID
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const getAdminById = async (id) => {
  const admin = await Admin.findById(id).select('-password');

  if (!admin) {
    const error = new Error('Admin not found');
    error.statusCode = 404;
    throw error;
  }

  return admin;
};

/**
 * Create or seed initial admin securely
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
export const seedAdmin = async (email, password) => {
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be provided');
  }

  const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (existingAdmin) {
    return {
      created: false,
      message: `Admin with email "${email}" already exists.`,
    };
  }

  const newAdmin = new Admin({
    email: email.toLowerCase().trim(),
    password, // Password is automatically hashed by Mongoose pre-save hook in Admin model
  });

  await newAdmin.save();

  return {
    created: true,
    message: `Admin account "${email}" created successfully.`,
    admin: {
      id: newAdmin._id,
      email: newAdmin.email,
    },
  };
};

export default {
  generateToken,
  loginAdmin,
  getAdminById,
  seedAdmin,
};
