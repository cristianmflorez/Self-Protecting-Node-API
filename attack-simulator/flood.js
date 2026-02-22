/**
 * Flood: mass concurrent requests to stress rate limit and concurrency control.
 * Usage: node attack-simulator/flood.js [baseUrl] [connections] [durationSec]
 */
const autocannon = require('autocannon');

const baseUrl = process.argv[2] || 'http://localhost:3000';
const connections = parseInt(process.argv[3] || '100', 10);
const duration = parseInt(process.argv[4] || '10', 10);

console.log(`Flood: ${baseUrl} connections=${connections} duration=${duration}s`);

autocannon(
  {
    url: baseUrl,
    path: '/health',
    connections,
    duration,
    pipelining: 2,
  },
  (err, result) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(autocannon.printResult(result));
  }
);
