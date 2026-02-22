# Benchmarks — Self-Protecting Node API

Comparative results: with vs without protections. Fill with real measurements after running attack-simulator and load tests.

## How to run

1. Start Redis and the API: `npm start`.
2. Run scenarios (e.g. `node attack-simulator/flood.js http://localhost:3000 80 15`).
3. Optionally disable rate limit/concurrency in config to compare "no protection" (risk of crash).
4. Record RPS, latency, CPU, and errors below.

## Results template

| Scenario              | RPS (approx) | Latency (p99 or avg) | CPU  | Errors     |
|-----------------------|--------------|----------------------|------|------------|
| No protection (flood) | —            | —                    | —    | crash/high |
| With protection       | —            | —                    | —    | stable     |
| Heavy no cache        | —            | ~2000ms              | —    | —          |
| Heavy with cache      | —            | ~5–50ms              | —    | —          |

## Graphs (optional)

- Requests vs time
- Latency vs load
- Cache hit ratio (from `GET /metrics`)

Export data from autocannon or `/metrics` and plot with Excel or another tool.
