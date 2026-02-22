/**
 * Heavy endpoint: compare response time without cache vs with cache.
 * First request ~2000ms (miss), second request ~5ms (hit).
 * Usage: node attack-simulator/heavy-endpoint-test.js [baseUrl]
 */
const http = require('http');
const url = require('url');

const baseUrl = process.argv[2] || 'http://localhost:3000';
const parsed = url.parse(`${baseUrl.replace(/\/$/, '')}/heavy-data`);

function request() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(
      {
        hostname: parsed.hostname || 'localhost',
        port: parsed.port || 3000,
        path: parsed.path || '/heavy-data',
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, durationMs: Date.now() - start, body });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  console.log('Heavy endpoint test:', baseUrl + '/heavy-data');
  console.log('First request (cache MISS, ~2000ms expected):');
  const first = await request();
  console.log(`  Status: ${first.statusCode}, Duration: ${first.durationMs}ms`);

  console.log('Second request (cache HIT, ~5-50ms expected):');
  const second = await request();
  console.log(`  Status: ${second.statusCode}, Duration: ${second.durationMs}ms`);

  if (first.durationMs > 1000 && second.durationMs < 500) {
    console.log('OK: Cache is working (first slow, second fast).');
  } else {
    console.log('Check: First should be ~2000ms, second should be much lower.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
