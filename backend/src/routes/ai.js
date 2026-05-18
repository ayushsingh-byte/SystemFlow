const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { chat } = require('../controllers/aiController');

router.post('/chat', authenticate, chat);

module.exports = router;
