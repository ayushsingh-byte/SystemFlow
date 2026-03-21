const { verifyToken, getUserById } = require('../services/authService');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });

  const token = header.slice(7);
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = getUserById(decoded.id);
  if (!user) return res.status(401).json({ error: 'User no longer exists' });

  req.user = { id: user.id, email: user.email, name: user.name };
  return next();
}

module.exports = authMiddleware;
