const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { apiLimiter } = require('./middleware/rateLimit');
const { setCsrfCookie, validateCsrf } = require('./middleware/csrf');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const simulationRoutes = require('./routes/simulations');
const analysisRoutes = require('./routes/analysis');
const aiRoutes = require('./routes/ai');
const intelRoutes = require('./routes/intel');

const app = express();

// ─── Trust proxy (required for real IPs behind nginx/Cloudflare) ──────────────

app.set('trust proxy', 1);

// ─── Security & parsing middleware ────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Explicit hardening options
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// Allow any localhost origin (dev) and same-origin (when served as static)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── CSRF: set cookie on every request, validate on state-changing API calls ──

app.use(setCsrfCookie);

// ─── Rate limiting on all API routes ──────────────────────────────────────────

app.use('/api', apiLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── CSRF token bootstrap endpoint ────────────────────────────────────────────

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.cookies?.csrfToken || null });
});

// ─── API Routes (CSRF validation applied) ─────────────────────────────────────

app.use('/api', validateCsrf);

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/intel', intelRoutes);

// ─── Serve frontend static files ──────────────────────────────────────────────
// Serving from backend means frontend + API share the same origin — no CORS needed.

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
app.use(express.static(PUBLIC_DIR));

// SPA fallback: GET requests that don't match a file serve SystemFlow.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(PUBLIC_DIR, 'SystemFlow.html'), (err) => {
    if (err) next();
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    status: 404,
    path: req.originalUrl,
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  }

  res.status(status).json({
    error: message,
    status,
  });
});

module.exports = app;
