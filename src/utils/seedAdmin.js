import 'dotenv/config';

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';

/**
 * Seed initial admin account securely
 */
const seedAdminAccount = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ Error: Both ADMIN_EMAIL and ADMIN_PASSWORD must be defined in your .env file.');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 6 characters long.');
    process.exit(1);
  }

  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('❌ Error: Unable to connect to MongoDB. Please set MONGODB_URI in your .env file.');
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });

    if (existingAdmin) {
      console.log(`ℹ️  Admin with email "${normalizedEmail}" already exists. No new account was created.`);
    } else {
      const admin = new Admin({
        email: normalizedEmail,
        password: password, // Mongoose pre-save hook in Admin.js automatically hashes this with bcrypt
      });

      await admin.save();
      console.log(`✅ Initial admin account "${normalizedEmail}" created successfully!`);
    }

    await mongoose.connection.close();
    console.log('🔒 Database connection closed safely.');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error during admin seeding: ${error.message}`);
    process.exit(1);
  }
};

seedAdminAccount();
