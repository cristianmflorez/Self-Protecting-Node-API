# Self-Protecting Node API

Node.js API that protects itself under load: rate limiting (100/min per IP), concurrency cap (50), request timeout (5s), 1MB body limit, security headers, Redis cache (60s TTL), and circuit breaker. Exposes Prometheus metrics and includes attack-simulator scripts. Runs locally (Node + Redis on host, no containers).

## Stack

Fastify, ioredis, prom-client, pino. Defenses: Helmet, @fastify/rate-limit, custom concurrency/timeout/circuit-breaker.

## Run

**Requirements:** Node.js 18+, Redis on `localhost:6379` (`redis-cli ping` → PONG).

```bash
npm install
npm start
```

API: `http://localhost:3000` (or `PORT`). Dev: `npm run dev`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/`, `/health` | Status, health |
| GET | `/heavy-data` | Heavy work (~2s); cached 60s (~5ms hit) |
| GET | `/metrics` | Prometheus metrics |
| POST | `/echo` | Body test (used for 413 payload-limit check) |

## Attack simulator

Start the API first. From project root:

```bash
node attack-simulator/flood.js [url] [connections] [durationSec]
node attack-simulator/burst.js [url] [totalRequests] [concurrency]
node attack-simulator/slow-client.js [url] [count] [delayMs]
node attack-simulator/heavy-endpoint-test.js [url]
```

Default `url`: `http://localhost:3000`.

## Tests

```bash
npm test
```

Covers: health, security headers, rate limit (429), payload limit (413), metrics, timeout config, `/heavy-data` shape.
