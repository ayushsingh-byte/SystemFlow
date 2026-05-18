const crypto = require('crypto');

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware: sets csrf cookie on GET requests
function setCsrfCookie(req, res, next) {
  if (!req.cookies?.csrfToken) {
    const token = generateCsrfToken();
    res.cookie('csrfToken', token, {
      httpOnly: false, // must be readable by JS to put in header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  next();
}

// Middleware: validates CSRF token on state-changing requests
function validateCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

module.exports = { setCsrfCookie, validateCsrf };
