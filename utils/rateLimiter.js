const rateLimit = require('express-rate-limit');

// Custom rate limiter that ignores X-Forwarded headers
function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    max = 100, // requests per windowMs
    message = "Too many attempts. Please try again later."
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Custom key generator that ignores X-Forwarded headers
    keyGenerator: (req) => {
      // Use a fixed key for local development
      // This essentially disables IP-based rate limiting
      return 'local-dev-key';
    },

    // Skip validation of X-Forwarded headers
    validate: {
      xForwardedForHeader: false
    },

    // Optional detailed error handling
    handler: (req, res, next, options) => {
      console.warn('Rate limit exceeded:', {
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
}

module.exports = {
  createRateLimiter
};