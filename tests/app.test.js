/**
 * Integration tests: rate limit, security headers, payload limit, metrics, health.
 * Redis is mocked so cache tests only verify behavior when Redis returns null (miss).
 */
process.env.HEAVY_DELAY_MS = '0';
const { buildApp } = require('../src/server');

describe('Self-Protecting API', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health and root', () => {
    it('GET /health returns 200 and status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });

    it('GET / returns 200 with app name', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.name).toBe('Self-Protecting-Node-API');
      expect(body.status).toBe('running');
    });
  });

  describe('security headers', () => {
    it('response includes security-related headers', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const headers = res.headers;
      expect(headers['x-content-type-options']).toBeDefined();
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-xss-protection'] !== undefined || headers['content-security-policy'] !== undefined).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when exceeding rate limit', async () => {
      const limit = 15;
      const appLimited = await buildAppWithRateLimit(limit);
      try {
        for (let i = 0; i < limit; i++) {
          await appLimited.inject({ method: 'GET', url: '/health' });
        }
        const res = await appLimited.inject({ method: 'GET', url: '/health' });
        expect(res.statusCode).toBe(429);
        const body = JSON.parse(res.payload);
        expect(body.error).toMatch(/Too Many|rate limit/i);
      } finally {
        await appLimited.close();
      }
    });
  });

  describe('payload limit', () => {
    it('rejects body larger than 1MB with 413', async () => {
      const oneMB = 1024 * 1024;
      const bigBody = 'x'.repeat(oneMB + 1);
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: bigBody,
        headers: { 'content-type': 'text/plain' },
      });
      expect(res.statusCode).toBe(413);
    });
  });

  describe('metrics', () => {
    it('GET /metrics returns 200 and Prometheus-style text', async () => {
      const res = await app.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.payload).toMatch(/http_requests_total/);
      expect(res.payload).toMatch(/http_request_duration_seconds/);
      expect(res.payload).toMatch(/cache_hits_total|cache_misses_total/);
      expect(res.payload).toMatch(/http_requests_active/);
    });
  });

  describe('timeout configuration', () => {
    it('server enforces request timeout (config 5s)', () => {
      const config = require('../src/config');
      expect(config.server.requestTimeout).toBe(5000);
    });
  });

  describe('heavy endpoint and cache', () => {
    it('GET /heavy-data returns 200 and data shape (cache miss when Redis unavailable)', async () => {
      const res = await app.inject({ method: 'GET', url: '/heavy-data' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBe('heavy-result');
      expect(body.computedAt).toBeDefined();
      expect(body.delayMs).toBe(2000);
    });
  });
});

async function buildAppWithRateLimit(max) {
  const Fastify = require('fastify');
  const config = require('../src/config');
  const { concurrencyMiddleware } = require('../src/middleware/concurrency');
  const { circuitBreakerMiddleware } = require('../src/middleware/circuitBreaker');
  const { totalRequests, requestDuration, blockedRequests } = require('../src/utils/metrics');

  const app = Fastify({
    logger: { level: 'silent' },
    requestTimeout: config.server.requestTimeout,
    bodyLimit: config.bodyLimit,
  });

  await app.register(require('@fastify/helmet'), { global: true });
  await app.register(require('@fastify/rate-limit'), {
    max,
    timeWindow: '1 minute',
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

  app.register(require('../src/routes/health'));
  app.register(require('../src/routes/heavy'));
  app.register(require('../src/routes/metrics'));
  return app;
}
