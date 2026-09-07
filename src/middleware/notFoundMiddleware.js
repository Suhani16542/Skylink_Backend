/**
 * 404 Not Found Middleware
 */
export const notFoundMiddleware = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export default notFoundMiddleware;
