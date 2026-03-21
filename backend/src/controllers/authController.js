const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');

const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').notEmpty().withMessage('Name is required').trim(),
];

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password, name } = req.body;
    const { user, token } = await authService.register(email, password, name);
    return res.status(201).json({ user, token });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    return res.status(200).json({ user, token });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

function me(req, res) {
  return res.status(200).json({ user: req.user });
}

function logout(req, res) {
  return res.status(200).json({ message: 'Logged out' });
}

module.exports = { register, registerValidation, login, loginValidation, me, logout };
