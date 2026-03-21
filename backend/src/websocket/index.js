const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../services/authService');

// Map of clientId -> { ws, userId, subscribedProjects: Set }
const clients = new Map();

// Map of userId -> Set<clientId> for fast user lookups
const userClients = new Map();

// Map of projectId -> Set<clientId> for fast project broadcast
const projectSubscriptions = new Map();

/**
 * Set up the WebSocket server on the given HTTP server instance
 * @param {import('http').Server} server
 */
function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Parse auth token from query string: ws://host/ws?token=<jwt>
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    let userId = null;

    if (!token) {
      ws.close(4001, 'Unauthorized: no token provided');
      return;
    }

    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
    } catch (err) {
      ws.close(4001, 'Unauthorized: invalid token');
      return;
    }

    const clientId = uuidv4();

    // Register client
    clients.set(clientId, { ws, userId, subscribedProjects: new Set() });

    // Register user -> clientId mapping
    if (!userClients.has(userId)) {
      userClients.set(userId, new Set());
    }
    userClients.get(userId).add(clientId);

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', clientId, userId }));

    ws.on('message', (rawData) => {
      let message;
      try {
        message = JSON.parse(rawData.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      handleMessage(clientId, ws, message);
    });

    ws.on('close', () => {
      cleanupClient(clientId, userId);
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error for client ${clientId}:`, err.message);
      cleanupClient(clientId, userId);
    });
  });

  console.log('WebSocket server initialized at /ws');
  return wss;
}

/**
 * Handle incoming messages from a client
 */
function handleMessage(clientId, ws, message) {
  const { type, projectId } = message;

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'subscribe_project':
      if (!projectId) {
        ws.send(JSON.stringify({ type: 'error', message: 'projectId required for subscribe_project' }));
        return;
      }
      subscribeToProject(clientId, projectId);
      ws.send(JSON.stringify({ type: 'subscribed', projectId }));
      break;

    case 'unsubscribe_project':
      if (projectId) {
        unsubscribeFromProject(clientId, projectId);
        ws.send(JSON.stringify({ type: 'unsubscribed', projectId }));
      }
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
  }
}

/**
 * Subscribe a client to project updates
 */
function subscribeToProject(clientId, projectId) {
  const client = clients.get(clientId);
  if (!client) return;

  client.subscribedProjects.add(projectId);

  if (!projectSubscriptions.has(projectId)) {
    projectSubscriptions.set(projectId, new Set());
  }
  projectSubscriptions.get(projectId).add(clientId);
}

/**
 * Unsubscribe a client from project updates
 */
function unsubscribeFromProject(clientId, projectId) {
  const client = clients.get(clientId);
  if (client) {
    client.subscribedProjects.delete(projectId);
  }

  const subs = projectSubscriptions.get(projectId);
  if (subs) {
    subs.delete(clientId);
    if (subs.size === 0) {
      projectSubscriptions.delete(projectId);
    }
  }
}

/**
 * Clean up all references for a disconnected client
 */
function cleanupClient(clientId, userId) {
  const client = clients.get(clientId);
  if (client) {
    // Remove from project subscriptions
    client.subscribedProjects.forEach((projectId) => {
      const subs = projectSubscriptions.get(projectId);
      if (subs) {
        subs.delete(clientId);
        if (subs.size === 0) {
          projectSubscriptions.delete(projectId);
        }
      }
    });
  }

  clients.delete(clientId);

  // Remove from user -> clientId mapping
  if (userId) {
    const uClients = userClients.get(userId);
    if (uClients) {
      uClients.delete(clientId);
      if (uClients.size === 0) {
        userClients.delete(userId);
      }
    }
  }
}

/**
 * Send a message to all connections belonging to a user
 * @param {string} userId
 * @param {object} message
 */
function broadcastToUser(userId, message) {
  const uClients = userClients.get(userId);
  if (!uClients || uClients.size === 0) return;

  const payload = JSON.stringify(message);

  uClients.forEach((clientId) => {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1 /* OPEN */) {
      client.ws.send(payload);
    }
  });
}

/**
 * Send a message to all clients subscribed to a project
 * @param {string} projectId
 * @param {object} message
 */
function broadcastToProject(projectId, message) {
  const subs = projectSubscriptions.get(projectId);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify(message);

  subs.forEach((clientId) => {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1 /* OPEN */) {
      client.ws.send(payload);
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcastToUser,
  broadcastToProject,
};
