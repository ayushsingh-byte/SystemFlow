const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  authController.registerValidation,
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  authController.loginValidation,
  authController.login
);

// GET /api/auth/me  (protected)
router.get('/me', authMiddleware, authController.me);

// POST /api/auth/logout (protected)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
