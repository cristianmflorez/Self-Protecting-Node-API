/**
 * Prometheus-style metrics endpoint.
 */
const { getMetricsContentType, getMetricsSnapshot } = require('../utils/metrics');

async function metricsRoutes(fastify) {
  fastify.get('/metrics', async (request, reply) => {
    const contentType = await getMetricsContentType();
    const metrics = await getMetricsSnapshot();
    return reply.type(contentType).send(metrics);
  });
}

module.exports = metricsRoutes;
