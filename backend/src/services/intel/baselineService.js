/**
 * Baseline service — proxies to Python ML service.
 * The Python service (ml/) runs on port 8000 and owns all baseline/anomaly state.
 */
const http = require('http');

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function getBaseline(nodeId, signal) {
  return _get(`${ML_BASE}/baseline/${encodeURIComponent(nodeId)}/${encodeURIComponent(signal)}`);
}

async function getAnomalies(nodeId, limit = 50) {
  return _get(`${ML_BASE}/anomalies/${encodeURIComponent(nodeId)}?limit=${limit}`);
}

function _get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`ML service parse error: ${e.message}`)); }
      });
    }).on('error', err => {
      const e = new Error(`ML service unreachable: ${err.message}`);
      e.status = 503;
      reject(e);
    });
  });
}

module.exports = { getBaseline, getAnomalies };
