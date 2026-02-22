/**
 * Heavy endpoint: simulates 2s work. Cached in Redis with TTL 60s.
 */
const { getRedis, config } = require('../cache/redisClient');
const { computeHeavyData } = require('../services/heavyService');
const { cacheHits, cacheMisses } = require('../utils/metrics');

const CACHE_KEY = 'heavy:data';
const TTL = config.heavyEndpointTTL;

async function heavyRoutes(fastify) {
  fastify.get('/heavy-data', async (request, reply) => {
    const redis = getRedis();
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        cacheHits.inc();
        return reply.send(JSON.parse(cached));
      }
    } catch (e) {
      fastify.log.warn({ err: e }, 'Redis get failed, computing without cache');
    }
    cacheMisses.inc();
    const data = await computeHeavyData();
    try {
      await getRedis().setex(CACHE_KEY, TTL, JSON.stringify(data));
    } catch (e) {
      fastify.log.warn({ err: e }, 'Redis set failed');
    }
    return reply.send(data);
  });
}

module.exports = heavyRoutes;
