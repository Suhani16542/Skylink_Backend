import mongoose from 'mongoose';

/**
 * Connect to MongoDB database using Mongoose
 * Handles graceful connection, connection logging, and error handling
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn('⚠️  MONGODB_URI is not defined in environment variables. MongoDB connection skipped.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

export default connectDB;
