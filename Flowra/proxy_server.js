const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Proxy Sanity API calls (Express strips /sanity-proxy prefix before passing to middleware)
app.use('/sanity-proxy', createProxyMiddleware({
  target: 'https://7m7t0x6z.apicdn.sanity.io',
  changeOrigin: true,
  on: {
    proxyRes: (proxyRes) => {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Proxy error' });
    },
  },
}));

// Proxy main app pages and assets to Next.js (port 3000)
const nextProxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error('Next.js proxy error:', err.message);
      res.status(502).send('App server unavailable. Start Next.js on port 3000.');
    },
  },
});

const NEXT_ROUTES = [
  '/login.html', '/register.html', '/SystemFlow.html',
  '/api.js', '/data.jsx', '/store.jsx', '/simulation.jsx',
  '/header.jsx', '/left-panel.jsx', '/canvas.jsx',
  '/right-panel.jsx', '/bottom-panel.jsx', '/modals.jsx', '/app.jsx',
  '/styles.css', '/styles-v2.css',
];

NEXT_ROUTES.forEach(route => app.use(route, nextProxy));

// Serve static files
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wav')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

// Fallback for Nuxt SPA routing
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 7777;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
