require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { setupWebSocket } = require('./src/websocket');

// Initialize DB (runs migrations on first boot)
require('./src/db');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`[SystemFlow] API running on http://localhost:${PORT}`);
  console.log(`[SystemFlow] DB: SQLite (./data/systemflow.db)`);
});
