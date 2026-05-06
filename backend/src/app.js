const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { apiLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const simulationRoutes = require('./routes/simulations');
const analysisRoutes = require('./routes/analysis');

const app = express();

// ─── Security & parsing middleware ────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate limiting on all API routes ──────────────────────────────────────────

app.use('/api', apiLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/analysis', analysisRoutes);

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
