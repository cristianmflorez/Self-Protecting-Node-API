/**
 * Burst: traffic spike in a few seconds (many requests in short window).
 * Usage: node attack-simulator/burst.js [baseUrl] [totalRequests] [concurrency]
 */
const autocannon = require('autocannon');

const baseUrl = process.argv[2] || 'http://localhost:3000';
const totalRequests = parseInt(process.argv[3] || '500', 10);
const concurrency = parseInt(process.argv[4] || '50', 10);

console.log(`Burst: ${baseUrl} total=${totalRequests} concurrency=${concurrency}`);

const run = autocannon(
  {
    url: baseUrl,
    path: '/health',
    connections: concurrency,
    amount: totalRequests,
    pipelining: 1,
  },
  (err, result) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(autocannon.printResult(result));
  }
);

autocannon.track(run, { renderProgressBar: true });
