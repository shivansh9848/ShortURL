# ShortURL — AI agent instructions

Purpose: give an AI coding agent the minimum, high-value knowledge to be immediately productive in this repository (ShortURL).

Keep edits small and conservative. This repo is a MERN-style shortener with service integration (Redis, MongoDB, ZooKeeper) and Docker Compose as the primary dev flow.

## Quick architecture summary

- Frontend: `client/` — Create React App (React 17). HTTP client at `client/src/api/api.js` posts to the nginx proxy.
- Reverse proxy: `nginx/nginx.conf` proxies to the Node API and handles permissive CORS.
- API: `server/` — Node + Express. Main route mounting in `server/server.js` and `server/src/routes/main.js`.
- Persistence & integration: MongoDB (URL model `server/src/models/url.js`), Redis caching `server/src/helpers/redis.js`, ZooKeeper token allocation `server/src/helpers/zookeeper.js`.

## Primary developer workflow (authoritative)

- Start locally (recommended): `docker compose up --build` from repo root. This brings up client, nginx, node-server, mongodb, redis, zookeeper.
- The client expects `REACT_APP_API_BASE_URL` defaulted to `http://localhost:4000` (see `client/src/api/api.js`).
- For quick changes in server code you can re-build the node image or run non-docker local dev by setting env vars from `.env.example` (not present in repo; infer from compose). Prefer Docker for parity.

## API surface & contracts (examples)

- POST /url — body: `{ OriginalUrl: string }` → response `{ Hash: string }`. Implemented by `server/src/controllers/zkController.js` (method `urlPost`).
- GET /url/:identifier — redirect (301/302) to OriginalUrl. Implemented by `zkController.urlGet`.

## Important patterns & conventions (do not change lightly)

- Caching: original-url → hash cached in Redis for 600s with `setEx`. See `server/src/helpers/redis.js` and `zkController` for usage.
- Token allocation: ZooKeeper hands out large token ranges to each node; code in `server/src/helpers/zookeeper.js` expects a token-range allocation pattern and a `hashGenerator(n)` base62 encoder.
- Analytics: visits are buffered in a job queue and flushed in batches (avoid per-request Mongo increments). Look for queue/batching logic in `server/src/helpers/redis.js` and controller.
- Naming gotcha: the purge worker checks `url.ExpirationDate` but the schema uses `ExpiresAt`. If you touch expiration logic, reconcile these names. See `server/src/workers/purgeAliases.js` and `server/src/models/url.js`.

## Key files to inspect when modifying behavior

- `server/server.js` — startup wiring (connectDB, connectRedis, connectZK) and mounting routes.
- `server/src/controllers/zkController.js` — core create/redirect logic and caching use.
- `server/src/helpers/zookeeper.js` — token allocation and `hashGenerator`.
- `server/src/helpers/redis.js` — cache helpers and visit batching.
- `server/src/models/url.js` — Mongo schema for URLs.
- `nginx/nginx.conf` — proxy + CORS rules (changes affect client and API behavior).

## Tests, linting, and build checks

- There are no project tests included. Verify quick sanity by bringing up the stack with Docker Compose and using the UI or `curl` to exercise `POST /url` and `GET /url/:id`.
- When changing server code, run a quick `node` run or rebuild the server image to catch obvious syntax errors. Keep edits small and run the service locally in Docker for integration checks.

## Small engineering contract for changes

- Inputs: HTTP requests defined above, ZooKeeper token integers, Redis cache keys.
- Outputs: persisted `Url` documents with fields `{ Hash, OriginalUrl, Visits, CreatedAt, ExpiresAt }` and Redis cached mappings.
- Success criteria for PRs: existing endpoints unchanged for consumers; no data-loss migrations; Redis TTL semantics preserved (600s for OriginalUrl->Hash cache).

## Typical edge cases and gotchas to watch for

- ZooKeeper unavailable: controller waits for ZK connection. Avoid long blocking operations during startup.
- Token collisions are handled by ZK allocation; do not replace token generation with a simple local sequence.
- Timezone/field name mismatch in purge worker (see Naming gotcha above).

## When adding new endpoints or helpers

- Add routes in `server/src/routes/main.js` and implement logic in `server/src/controllers/*`.
- Use `server/src/helpers/*` for integrations (Mongo, Redis, ZooKeeper); prefer reusing existing helper functions to keep connection singletons.

## Example snippets (where to look)

- URL post flow: `client/src/api/api.js` -> `nginx` -> `server/src/routes/main.js` -> `zkController.urlPost` -> `redis` -> `mongodb` -> `zookeeper`.

## If something is missing or unclear

- Ask for the missing env files or docker-compose overrides. If you need to run services locally without Docker, request `.env.example` values.

---

If you'd like, I can: (1) run a quick read of `server/src/controllers/zkController.js` and `server/src/helpers/zookeeper.js` and add 2–3 inline examples to this file, or (2) add a small checklist for PR reviewers focused on the ZooKeeper/Redis semantics. Which would you prefer?

# URLink – AI agent working notes

Purpose: Make agents productive fast by summarizing this repo’s architecture, workflows, and project-specific patterns. Keep changes consistent with what exists—don’t introduce new frameworks or speculative practices.

## Big picture architecture

- MERN-style app, but server-rendered API only:
  - client/ (React 17, CRA) → talks to nginx at http://localhost:4000
  - nginx/ → reverse proxy + CORS → routes to node-server:8081
  - server/ (Node + Express) → business logic; uses MongoDB, Redis, ZooKeeper
  - docker-compose.yml spins up: client, node-server, mongodb, redis, zookeeper, nginx
- Data flow
  - Client POST /url with { OriginalUrl }
  - Nginx proxies to node-server → controller checks Redis → MongoDB → ZooKeeper for unique token range → Base62 hash → persist → cache in Redis
  - GET /url/:identifier redirects to OriginalUrl and enqueues a visit for batched increment

## Run, build, scale

- Primary workflow: Docker Compose
  - Start: docker compose up --build
  - Scale API workers: docker compose up --scale node-server=3
  - Ports: client 3000, nginx 4000→80, node-server 8081 (internal), redis 6379, mongo 27017, zookeeper 2181
- Local dev (non-Docker) is possible but not first-class; if you do, set env vars from .env.example

## External services & env

- MongoDB URI, Redis, and ZooKeeper hosts are injected via docker-compose env; see .env.example for overrides
- Client base URL uses REACT_APP_API_BASE_URL (defaults to http://localhost:4000)

## API surface and patterns

- Endpoints (server/src/routes/main.js)
  - POST /url → controllers/zkController.urlPost
  - GET /url/:identifier → controllers/zkController.urlGet (redirects)
  - GET /del → controllers/zkController.tokenDelete (deletes ZK token node)
- Request/Response contract
  - POST /url body: { OriginalUrl: string }
  - Response: { Hash: string }
  - GET /url/:identifier: 301/302 redirect to OriginalUrl (no JSON)

## Core implementation details

- Hash generation (server/src/helpers/zookeeper.js)
  - ZooKeeper hands out unique 1M token ranges per node; range.curr increments per URL
  - Base62 encoder hashGenerator(n) builds the short code
  - zkClient path /token stores the last allocated start token
- Caching (server/src/helpers/redis.js)
  - Redis stores mapping OriginalUrl → Hash with TTL 600s via setEx
  - Visit analytics batching: jobQueue buffers up to 10 hashes; on flush, increments Visits in Mongo with $inc
- Persistence (server/src/models/url.js)
  - { Hash, OriginalUrl, Visits, CreatedAt, ExpiresAt }
- Expiration worker (server/src/workers/purgeAliases.js)
  - Cron at 00:00 daily deletes expired URLs
  - Gotcha: worker checks url.ExpirationDate but schema uses ExpiresAt; keep names consistent when editing

## Client integration (examples)

- HTTP client: client/src/api/api.js
  - axios baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:4000"
  - postURL(input): POST /url with { OriginalUrl: input }
- UI: client/src/components/Input/Input.jsx
  - Validates URL via regex, calls postURL, shows http://localhost:4000/url/{Hash}

## Nginx proxy

- nginx/nginx.conf proxies all traffic to http://node-server:8081 and sets permissive CORS; OPTIONS handled with 204

## Conventions to follow

- Add new endpoints via routes in server/src/routes/main.js and implement logic in server/src/controllers; use helpers for external systems (Mongo, Redis, ZooKeeper)
- Keep API stateless; do not introduce server-side sessions
- Cache lookups by OriginalUrl; keep TTL semantics consistent (setEx 600s)
- For analytics, respect the batch queue pattern instead of per-request writes
- Maintain field names per model; if changing ExpiresAt, update worker accordingly

## Quick file map

- server/server.js: startup wiring (connectDB, connectRedis, connectZK) and route mounting
- server/src/controllers/zkController.js: main URL create/redirect logic
- server/src/helpers/{mongodb,redis,zookeeper}.js: integrations
- server/src/models/url.js: URL schema
- server/src/workers/purgeAliases.js: daily cleanup
- client/src/api/api.js and components/Input/\*: primary client flow
- docker-compose.yml and nginx/nginx.conf: infra and routing

## Safety & troubleshooting

- Nginx is the public entry for API; don’t expose node-server directly in compose unless intentional
- If ZK isn’t connected, urlPost waits via waitForConnection; avoid long-running operations before it
- Redis client is singleton via connectRedis/getRedisClient; reuse it instead of creating new clients per request
