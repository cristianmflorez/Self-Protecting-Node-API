/**
 * Prometheus-style metrics. Tracks requests, blocked, latency, cache hits/misses, active concurrency.
 */
const { register, Counter, Histogram, Gauge } = require('prom-client');

const totalRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const blockedRequests = new Counter({
  name: 'http_requests_blocked_total',
  help: 'Total number of blocked requests (rate limit, concurrency, etc)',
  labelNames: ['reason'],
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const activeConcurrent = new Gauge({
  name: 'http_requests_active',
  help: 'Number of requests currently being processed',
});

const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
});

function getRegister() {
  return register;
}

async function getMetricsContentType() {
  return register.contentType;
}

async function getMetricsSnapshot() {
  return register.metrics();
}

module.exports = {
  totalRequests,
  blockedRequests,
  requestDuration,
  activeConcurrent,
  cacheHits,
  cacheMisses,
  getRegister,
  getMetricsContentType,
  getMetricsSnapshot,
};
