/**
 * Health check route. No auth, no heavy logic.
 */
async function healthRoutes(fastify) {
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  fastify.get('/', async () => ({ name: 'Self-Protecting-Node-API', status: 'running' }));
  fastify.post('/echo', async (request, reply) => reply.send({ ok: true }));
}

module.exports = healthRoutes;
