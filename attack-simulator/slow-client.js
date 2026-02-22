/**
 * Slow client: requests that take a long time to complete (e.g. slow read).
 * Simulates clients that hold connections open. Use with timeout protection.
 * Usage: node attack-simulator/slow-client.js [baseUrl] [count] [delayBeforeCloseMs]
 */
const http = require('http');
const url = require('url');

const baseUrl = process.argv[2] || 'http://localhost:3000';
const count = parseInt(process.argv[3] || '5', 10);
const delayMs = parseInt(process.argv[4] || '10000', 10);

const parsed = url.parse(baseUrl);
const options = {
  hostname: parsed.hostname || 'localhost',
  port: parsed.port || 3000,
  path: parsed.path || '/heavy-data',
  method: 'GET',
};

console.log(`Slow client: ${count} connections, holding for ${delayMs}ms each to ${baseUrl}`);

let completed = 0;
for (let i = 0; i < count; i++) {
  const req = http.request(options, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      completed += 1;
      console.log(`Request ${i + 1} finished with status ${res.statusCode}`);
    });
  });
  req.on('error', (e) => {
    console.error(`Request ${i + 1} error:`, e.message);
    completed += 1;
  });
  req.setTimeout(delayMs + 2000, () => {
    req.destroy();
    completed += 1;
  });
  req.end();
}

const check = setInterval(() => {
  if (completed >= count) {
    clearInterval(check);
    console.log('Done.');
  }
}, 500);
