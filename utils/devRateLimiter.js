const rateLimit = require('express-rate-limit');

// Simplified rate limiter for local development
const createDevRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    max = 100, // More permissive for development
    message = "Too many attempts. Please try again later."
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Simple key generator that works with local development
    keyGenerator: (req) => {
      // For local development, use a more relaxed approach
      return req.ip || 'unknown';
    },

    // More verbose logging for development
    handler: (req, res, next, options) => {
      console.warn('Rate limit exceeded:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message
      });
    }
  });
};

module.exports = {
  createDevRateLimiter
};