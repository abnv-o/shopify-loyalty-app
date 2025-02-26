const rateLimit = require('express-rate-limit');
const { isIP } = require('net');

// Helper function to normalize and validate IP addresses
function normalizeIP(ip) {
  // Remove port if present
  const cleanIP = ip.includes(':') ? ip.split(':')[0] : ip;
  
  // Validate IP
  const ipType = isIP(cleanIP);
  
  if (ipType === 0) {
    console.warn('Invalid IP address:', ip);
    return 'unknown';
  }
  
  return cleanIP;
}

// Enhanced IPv6-friendly rate limiter
const createIPRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    max = 5, // 5 attempts per window
    message = "Too many attempts. Please try again later.",
    keyGenerator = null
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Comprehensive IP key generation
    keyGenerator: (req) => {
      // Priority order for IP detection
      const ipSources = [
        req.headers['x-forwarded-for'],
        req.headers['x-real-ip'],
        req.ip,
        req.connection.remoteAddress,
        req.socket.remoteAddress
      ];

      // Custom key generator if provided
      if (typeof keyGenerator === 'function') {
        const customKey = keyGenerator(req);
        if (customKey) return customKey;
      }

      // Find first valid IP
      for (const source of ipSources) {
        if (source) {
          // Handle multiple IPs in X-Forwarded-For
          const ip = source.includes(',') 
            ? source.split(',')[0].trim() 
            : source;
          
          const normalizedIP = normalizeIP(ip);
          
          // Skip localhost/loopback
          if (normalizedIP !== '::1' && normalizedIP !== '127.0.0.1') {
            return normalizedIP;
          }
        }
      }

      return 'unknown';
    },

    // Optional: Skip rate limiting for certain conditions
    skip: (req, res) => {
      // Add any specific skip logic here if needed
      return false;
    },

    // Enhanced error handling
    handler: (req, res, next, options) => {
      console.warn('Rate limit exceeded:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000 / 60) // minutes
      });
    }
  });
};

module.exports = {
  createIPRateLimiter
};