/**
 * Global concurrency control. Returns 503 when max active requests exceeded.
 */
const config = require('../config');
const { activeConcurrent, blockedRequests } = require('../utils/metrics');

let activeCount = 0;
const maxActive = config.concurrency.maxActive;

async function concurrencyMiddleware(request, reply) {
  if (activeCount >= maxActive) {
    blockedRequests.inc({ reason: 'concurrency' });
    return reply.status(503).send({
      error: 'Server overloaded',
      message: 'Too many concurrent requests. Try again later.',
    });
  }
  activeCount += 1;
  activeConcurrent.set(activeCount);

  request.raw.on('close', () => {
    if (request.raw.destroyed) {
      activeCount = Math.max(0, activeCount - 1);
      activeConcurrent.set(activeCount);
    }
  });

  reply.raw.on('finish', () => {
    activeCount = Math.max(0, activeCount - 1);
    activeConcurrent.set(activeCount);
  });
}

module.exports = { concurrencyMiddleware };
