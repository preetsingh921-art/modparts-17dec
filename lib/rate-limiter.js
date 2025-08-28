const rateLimit = require('express-rate-limit');

// Rate limiting configurations for different endpoints
const rateLimiters = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for admin users (optional)
      return false;
    }
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
      success: false,
      message: 'Too many authentication attempts from this IP, please try again in 15 minutes.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  }),

  // Very strict rate limiting for registration
  registration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Increased from 3 to 5 registration attempts per hour
    message: {
      success: false,
      message: 'Too many registration attempts from this IP, please try again in 1 hour.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development
    skip: (req) => process.env.NODE_ENV === 'development',
  }),

  // Password reset rate limiting
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset attempts per hour
    message: {
      success: false,
      message: 'Too many password reset attempts from this IP, please try again in 1 hour.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Email verification rate limiting
  emailVerification: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 email verification attempts per hour
    message: {
      success: false,
      message: 'Too many email verification attempts from this IP, please try again in 1 hour.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
};

// Helper function to get appropriate rate limiter
const getRateLimiter = (type) => {
  return rateLimiters[type] || rateLimiters.general;
};

// Custom rate limiter that can be applied conditionally
const createConditionalRateLimiter = (type, condition) => {
  const limiter = getRateLimiter(type);
  
  return (req, res, next) => {
    if (condition && condition(req)) {
      return limiter(req, res, next);
    }
    next();
  };
};

// Rate limiter for specific user actions (by user ID)
const createUserActionLimiter = (windowMs, max, message) => {
  const userLimiters = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.body?.userId;
    
    if (!userId) {
      return next();
    }
    
    const now = Date.now();
    const userKey = `user_${userId}`;
    
    if (!userLimiters.has(userKey)) {
      userLimiters.set(userKey, {
        count: 0,
        resetTime: now + windowMs
      });
    }
    
    const userLimit = userLimiters.get(userKey);
    
    // Reset if window has passed
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
    }
    
    // Check if limit exceeded
    if (userLimit.count >= max) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }
    
    userLimit.count++;
    next();
  };
};

module.exports = {
  rateLimiters,
  getRateLimiter,
  createConditionalRateLimiter,
  createUserActionLimiter
};
