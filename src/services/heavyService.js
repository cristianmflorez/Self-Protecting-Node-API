/**
 * Simulates expensive work (e.g. 2s delay). Used by GET /heavy-data with optional cache.
 */
const config = require('../config');

const delayMs = config.heavyEndpoint.simulatedDelayMs;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function computeHeavyData() {
  await sleep(delayMs);
  return {
    data: 'heavy-result',
    computedAt: new Date().toISOString(),
    delayMs,
  };
}

module.exports = { computeHeavyData };
