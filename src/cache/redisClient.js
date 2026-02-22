/**
 * Redis client singleton. Connects to localhost:6379 by default.
 * Used by cache layer for heavy endpoint and optional rate-limit store.
 */
const Redis = require('ioredis');
const config = require('../config');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;

function getRedis() {
  if (!client) {
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });
  }
  return client;
}

async function connect() {
  const redis = getRedis();
  await redis.ping();
  return redis;
}

async function disconnect() {
  if (client) {
    await client.quit();
    client = null;
  }
}

module.exports = {
  getRedis,
  connect,
  disconnect,
  config: config.cache,
};
