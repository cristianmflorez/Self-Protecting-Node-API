/**
 * Application configuration. All limits and timeouts in one place.
 */
module.exports = {
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    requestTimeout: 5000, // 5 seconds
  },
  rateLimit: {
    max: 100,
    timeWindow: '1 minute',
  },
  bodyLimit: 1024 * 1024, // 1MB
  concurrency: {
    maxActive: 50,
  },
  cache: {
    heavyEndpointTTL: 60, // seconds
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
  },
  heavyEndpoint: {
    simulatedDelayMs: Number(process.env.HEAVY_DELAY_MS) || 2000,
  },
};
