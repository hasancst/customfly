import logger from '../config/logger.js';

/**
 * Global error handler untuk menangkap semua unhandled errors
 * Logs error details dan return safe response ke client
 */
export const errorHandler = (err, req, res, next) => {
  // Log error dengan context
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    shop: res.locals.shopify?.session?.shop,
    body: req.body,
    query: req.query
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.details 
    })
  });
};

/**
 * Async error wrapper untuk route handlers
 * Menghindari try-catch berulang di setiap route
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
