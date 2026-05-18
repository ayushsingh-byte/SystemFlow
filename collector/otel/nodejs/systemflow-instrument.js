/**
 * SystemFlow Node.js auto-instrumentation.
 * Collects application-layer signals: event_loop_lag, gc_pause_time,
 * request_rate, request_latency_p50/p95/p99, error_rate_4xx/5xx/timeout,
 * request_queue_depth, thread_pool_saturation, active_sessions.
 *
 * Usage:
 *   NODE_OPTIONS="--require ./systemflow-instrument.js" node server.js
 *
 * Env vars:
 *   SF_NODE_ID       — unique ID for this node (required)
 *   SF_KAFKA_BROKERS — kafka brokers (default: localhost:9092)
 *   SF_INTERVAL_MS   — publish interval in ms (default: 15000)
 *   SF_ACTIVE_SESSIONS_COUNTER — global var name exposing session count (optional)
 */

'use strict';

const { performance, PerformanceObserver } = require('perf_hooks');
const http  = require('http');
const https = require('https');

// ── Config ───────────────────────────────────────────────────────────────────
const NODE_ID  = process.env.SF_NODE_ID || `nodejs:${require('os').hostname()}`;
const BROKERS  = process.env.SF_KAFKA_BROKERS || 'localhost:9092';
const INTERVAL = parseInt(process.env.SF_INTERVAL_MS || '15000', 10);

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  eventLoopLags: [],       // ms samples collected between ticks
  gcPauses: [],            // ms samples from PerformanceObserver
  requestCounts: { total: 0, s4xx: 0, s5xx: 0, timeout: 0 },
  requestLatencies: [],    // ms per completed request
  queueDepth: 0,           // active in-flight requests
  activeSessions: 0,
};

// ── Event loop lag measurement ────────────────────────────────────────────────
// Schedule a setImmediate, measure how long it actually took vs expected (0ms).
function measureEventLoopLag() {
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    state.eventLoopLags.push(lag);
    setTimeout(measureEventLoopLag, 100); // sample every 100ms
  });
}
measureEventLoopLag();

// ── GC pause measurement ──────────────────────────────────────────────────────
try {
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'gc') {
        state.gcPauses.push(entry.duration);
      }
    }
  });
  obs.observe({ entryTypes: ['gc'] });
} catch (_) {
  // GC observations not available in this Node.js version
}

// ── HTTP request instrumentation ──────────────────────────────────────────────
// Monkey-patch http.Server.prototype.emit to intercept 'request' events.
const _origEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function(event, req, res) {
  if (event === 'request') {
    state.queueDepth++;
    const start = Date.now();

    const _origEnd = res.end.bind(res);
    res.end = function(...args) {
      const duration = Date.now() - start;
      state.queueDepth = Math.max(0, state.queueDepth - 1);
      state.requestCounts.total++;
      state.requestLatencies.push(duration);

      const code = res.statusCode;
      if (code >= 400 && code < 500) state.requestCounts.s4xx++;
      else if (code >= 500)           state.requestCounts.s5xx++;

      return _origEnd(...args);
    };

    // Timeout detection: if response not ended within 30s, count as timeout
    const timeoutHandle = setTimeout(() => {
      state.requestCounts.timeout++;
    }, 30_000);
    res.on('finish', () => clearTimeout(timeoutHandle));
  }
  return _origEmit.call(this, event, req, res);
};

// ── Percentile helper ─────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Thread pool saturation ────────────────────────────────────────────────────
// Estimate via libuv thread pool probe: schedule N tasks, measure queue time.
function measureThreadPoolSaturation(cb) {
  const POOL_SIZE = parseInt(process.env.UV_THREADPOOL_SIZE || '4', 10);
  const probes = 4;
  let completed = 0;
  let maxDelay = 0;
  const start = Date.now();

  for (let i = 0; i < probes; i++) {
    // crypto.randomBytes forces a libuv thread pool task
    require('crypto').randomBytes(1, () => {
      completed++;
      const elapsed = Date.now() - start;
      maxDelay = Math.max(maxDelay, elapsed);
      if (completed === probes) {
        // If tasks took >10ms each on average, pool is under load
        const saturation = Math.min(1.0, (maxDelay / probes) / 50);
        cb(saturation);
      }
    });
  }
}

// ── Signal publication ────────────────────────────────────────────────────────
function publish(readings) {
  // POST batch to the pipeline consumer's HTTP ingest endpoint (via local agent)
  // Or directly to Kafka via HTTP bridge if available.
  // Default: POST to SF_INGEST_URL (the Express backend /api/intel/signals/ingest/batch)
  const ingestURL = process.env.SF_INGEST_URL || 'http://localhost:4000/api/intel/signals/ingest/batch';
  const body = JSON.stringify({ readings });
  const url = new URL(ingestURL);
  const lib = url.protocol === 'https:' ? https : http;

  const req = lib.request({
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-SF-Collector': 'nodejs-instrument',
    },
  }, res => res.resume());
  req.on('error', () => {}); // silent — collector must not crash the app
  req.write(body);
  req.end();
}

// ── Collection loop ───────────────────────────────────────────────────────────
function collect() {
  const ts = Date.now();

  // Snapshot and reset
  const lags = state.eventLoopLags.splice(0);
  const gcs  = state.gcPauses.splice(0);
  const lats = state.requestLatencies.splice(0);
  const counts = { ...state.requestCounts };
  state.requestCounts.s4xx = 0;
  state.requestCounts.s5xx = 0;
  state.requestCounts.timeout = 0;
  // total is cumulative — don't reset, compute rate from delta instead
  // (simplified: treat total/interval as rate)

  const intervalSec = INTERVAL / 1000;

  measureThreadPoolSaturation(saturation => {
    // Try to get active sessions from a global counter exposed by the app
    const sessionVarName = process.env.SF_ACTIVE_SESSIONS_COUNTER;
    const activeSessions = sessionVarName ? (global[sessionVarName] || 0) : 0;

    const readings = [
      // Event loop
      { node_id: NODE_ID, signal: 'event_loop_lag',       value: percentile(lags, 99),   timestamp_ms: ts, unit: 'ms' },
      // GC
      { node_id: NODE_ID, signal: 'gc_pause_time',         value: gcs.reduce((s,v)=>s+v,0), timestamp_ms: ts, unit: 'ms' },
      // Request rate
      { node_id: NODE_ID, signal: 'request_rate',          value: counts.total / intervalSec, timestamp_ms: ts, unit: 'req/s' },
      // Latency
      { node_id: NODE_ID, signal: 'request_latency_p50',   value: percentile(lats, 50),   timestamp_ms: ts, unit: 'ms' },
      { node_id: NODE_ID, signal: 'request_latency_p95',   value: percentile(lats, 95),   timestamp_ms: ts, unit: 'ms' },
      { node_id: NODE_ID, signal: 'request_latency_p99',   value: percentile(lats, 99),   timestamp_ms: ts, unit: 'ms' },
      // Errors
      { node_id: NODE_ID, signal: 'error_rate_4xx',         value: counts.s4xx / intervalSec,     timestamp_ms: ts, unit: 'errors/s' },
      { node_id: NODE_ID, signal: 'error_rate_5xx',         value: counts.s5xx / intervalSec,     timestamp_ms: ts, unit: 'errors/s' },
      { node_id: NODE_ID, signal: 'error_rate_timeout',     value: counts.timeout / intervalSec,  timestamp_ms: ts, unit: 'errors/s' },
      // Queue
      { node_id: NODE_ID, signal: 'request_queue_depth',    value: state.queueDepth,       timestamp_ms: ts, unit: 'count' },
      // Thread pool
      { node_id: NODE_ID, signal: 'thread_pool_saturation', value: saturation,             timestamp_ms: ts, unit: 'ratio' },
      // Sessions
      { node_id: NODE_ID, signal: 'active_sessions',        value: activeSessions,         timestamp_ms: ts, unit: 'count' },
    ];

    publish(readings);
  });
}

// Reset total request count each interval so rate is per-interval not cumulative
let _lastTotal = 0;
setInterval(() => {
  state.requestCounts.total = state.requestCounts.total - _lastTotal;
  _lastTotal = 0;
  collect();
}, INTERVAL);

if (process.env.SF_DEBUG) {
  console.log(`[SystemFlow] NodeJS instrumentation active. node_id=${NODE_ID} interval=${INTERVAL}ms`);
}
