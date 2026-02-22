/**
 * Self-Protecting Node API. Order: security (helmet, rate-limit, body) → resilience (concurrency, timeout) → routes.
 */
const Fastify = require('fastify');
const config = require('./config');
const { concurrencyMiddleware } = require('./middleware/concurrency');
const { circuitBreakerMiddleware } = require('./middleware/circuitBreaker');
const { totalRequests, requestDuration, blockedRequests } = require('./utils/metrics');
const { connect: connectRedis, disconnect: disconnectRedis } = require('./cache/redisClient');

async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    requestIdHeader: 'x-request-id',
    requestTimeout: config.server.requestTimeout,
    bodyLimit: config.bodyLimit,
  });

  await app.register(require('@fastify/helmet'), { global: true });
  await app.register(require('@fastify/rate-limit'), {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Try again later.',
      statusCode: 429,
    }),
  });

  app.addHook('preHandler', async (request, reply) => {
    request.reqStartTime = Date.now();
    await concurrencyMiddleware(request, reply);
    if (reply.sent) return;
    await circuitBreakerMiddleware(request, reply);
  });

  app.addHook('onResponse', async (request, reply) => {
    const status = reply.statusCode.toString();
    const path = request.routerPath || request.url?.split('?')[0] || '';
    totalRequests.inc({ method: request.method, path, status });
    if (request.reqStartTime) {
      requestDuration.observe({ method: request.method, path }, (Date.now() - request.reqStartTime) / 1000);
    }
    if (status === '429') blockedRequests.inc({ reason: 'rate_limit' });
    if (status === '503') blockedRequests.inc({ reason: 'concurrency_or_circuit' });
    if (request.circuitBreakerRecordSuccess && status >= 200 && status < 400) request.circuitBreakerRecordSuccess();
    if (request.circuitBreakerRecordFailure && status >= 500) request.circuitBreakerRecordFailure();
  });

  app.register(require('./routes/health'));
  app.register(require('./routes/heavy'));
  app.register(require('./routes/metrics'));

  app.addHook('onClose', async () => {
    await disconnectRedis();
  });

  return app;
}

async function start() {
  const app = await buildApp();
  try {
    await connectRedis();
  } catch (e) {
    app.log.warn({ err: e }, 'Redis connect failed; cache will not work until Redis is available');
  }
  await app.listen({ port: config.server.port, host: config.server.host });
  app.log.info({ port: config.server.port }, 'Server listening');
  return app;
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildApp, start };
