const rateLimit = require('express-rate-limit');

/**
 * Auth limiter: 10 requests per 15 minutes per IP
 * Applied to /api/auth routes (register, login)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes',
  },
  skipSuccessfulRequests: false,
});

/**
 * General API limiter: 100 requests per 15 minutes per IP
 * Applied to all /api routes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again after 15 minutes',
  },
  skipSuccessfulRequests: false,
});

/**
 * Analysis limiter: 20 requests per 15 minutes per IP
 * Applied to /api/analysis routes (compute-intensive)
 */
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many analysis requests, please try again after 15 minutes',
  },
  skipSuccessfulRequests: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  analysisLimiter,
};
