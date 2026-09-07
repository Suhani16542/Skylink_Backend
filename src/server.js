import 'dotenv/config';

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

/**
 * Start the HTTP server and initialize database connection
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Skylink Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth API:     http://localhost:${PORT}/api/auth/login`);
      console.log('====================================================');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`💥 Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(`💥 Uncaught Exception: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
