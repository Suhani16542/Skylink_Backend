import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import formRoutes from './routes/formRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS)
const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin: clientUrl ? clientUrl.split(',').map((url) => url.trim()) : '*',
    credentials: true,
  })
);

// HTTP request logger
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/categories', categoryRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Skylink Backend API',
  });
});

// 404 & Centralized Error Middleware
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
