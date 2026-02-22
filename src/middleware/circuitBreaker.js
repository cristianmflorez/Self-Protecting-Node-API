/**
 * Simple in-memory circuit breaker. After failureThreshold failures, opens for resetTimeout ms.
 */
const config = require('../config');

const state = new Map(); // route key -> { failures, lastFailure, openUntil }

function getKey(request) {
  return request.routerPath || request.url?.split('?')[0] || 'default';
}

function isOpen(key) {
  const s = state.get(key);
  if (!s) return false;
  if (s.failures < config.circuitBreaker.failureThreshold) return false;
  if (Date.now() < s.openUntil) return true;
  state.set(key, { failures: 0, lastFailure: 0, openUntil: 0 });
  return false;
}

function recordSuccess(key) {
  const s = state.get(key) || { failures: 0, lastFailure: 0, openUntil: 0 };
  s.failures = 0;
  state.set(key, s);
}

function recordFailure(key) {
  const s = state.get(key) || { failures: 0, lastFailure: 0, openUntil: 0 };
  s.failures += 1;
  s.lastFailure = Date.now();
  if (s.failures >= config.circuitBreaker.failureThreshold) {
    s.openUntil = Date.now() + config.circuitBreaker.resetTimeout;
  }
  state.set(key, s);
}

async function circuitBreakerMiddleware(request, reply) {
  const key = getKey(request);
  if (isOpen(key)) {
    return reply.status(503).send({
      error: 'Service temporarily unavailable',
      message: 'Circuit breaker open. Try again later.',
    });
  }
  // Let the route run; we need to hook into onSend or error handler to record success/failure.
  request.circuitBreakerKey = key;
  request.circuitBreakerRecordSuccess = () => recordSuccess(key);
  request.circuitBreakerRecordFailure = () => recordFailure(key);
}

module.exports = {
  circuitBreakerMiddleware,
  isOpen,
  recordSuccess,
  recordFailure,
};
