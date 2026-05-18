/**
 * Intel service — signal ingestion + TSDB query.
 * Writes to VictoriaMetrics via Remote Write protocol.
 * Reads from VictoriaMetrics query API.
 */
const http = require('http');

const VM_BASE = process.env.VICTORIAMETRICS_URL || 'http://localhost:8428';

/**
 * Ingest a single signal reading into VictoriaMetrics.
 * Uses Prometheus exposition format: metric_name{labels} value timestamp
 */
async function ingestSignal({ node_id, signal, value, timestamp_ms, unit }) {
  const metricName = `sf_${signal.replace(/-/g, '_')}`;
  const labels = `node_id="${node_id}",unit="${unit || ''}"`;
  const line = `${metricName}{${labels}} ${value} ${timestamp_ms}\n`;
  return _vmWrite(line);
}

async function ingestBatch(readings) {
  const lines = readings.map(r => {
    const metricName = `sf_${r.signal.replace(/-/g, '_')}`;
    const labels = `node_id="${r.node_id}",unit="${r.unit || ''}"`;
    return `${metricName}{${labels}} ${r.value} ${r.timestamp_ms || Date.now()}`;
  }).join('\n') + '\n';
  return _vmWrite(lines);
}

/**
 * Query a signal timeseries from VictoriaMetrics.
 * Returns { timestamps: [], values: [] }
 */
async function querySignal({ node_id, signal, from, to, step }) {
  const metricName = `sf_${signal.replace(/-/g, '_')}`;
  const query = encodeURIComponent(`${metricName}{node_id="${node_id}"}`);
  const url = `${VM_BASE}/api/v1/query_range?query=${query}&start=${from / 1000}&end=${to / 1000}&step=${step}`;
  const raw = await _vmGet(url);
  const result = raw?.data?.result?.[0]?.values || [];
  return {
    timestamps: result.map(([ts]) => ts * 1000),
    values: result.map(([, v]) => parseFloat(v)),
  };
}

/**
 * List all node IDs that have emitted signals.
 */
async function listNodes() {
  const url = `${VM_BASE}/api/v1/label/node_id/values`;
  const raw = await _vmGet(url);
  return raw?.data || [];
}

// ── Internal helpers ────────────────────────────────────────────────────────

function _vmWrite(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${VM_BASE}/api/v1/import/prometheus`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 8428,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      res.resume();
      if (res.statusCode >= 400) {
        const err = new Error(`VictoriaMetrics write failed: ${res.statusCode}`);
        err.status = 502;
        reject(err);
      } else {
        resolve();
      }
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function _vmGet(urlStr) {
  return new Promise((resolve, reject) => {
    http.get(urlStr, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

module.exports = { ingestSignal, ingestBatch, querySignal, listNodes };
