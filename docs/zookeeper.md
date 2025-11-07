## ZooKeeper in this project — simple, detailed explanation

This document explains how Apache ZooKeeper is used in the ShortURL project. It breaks down the responsibilities, data flow, token allocation scheme, failure modes, and practical notes developers should know.

### Purpose of ZooKeeper here

- Provide a single source of truth for issuing globally unique numeric tokens used to generate short URL hashes.
- Coordinate multiple node-server instances so that each instance can generate unique IDs without conflict or constant cross-node locking.

In short: ZooKeeper hands out contiguous numeric token ranges to API nodes. Each node then locally converts those numeric tokens to Base62 short codes (the URL hash) and persists the mapping in MongoDB.

### High-level flow (POST /url)

1. Client POSTs { OriginalUrl } to the API (proxied by nginx).
2. API controller checks Redis cache for existing hash for that OriginalUrl.
3. If not cached, the server needs a new unique numeric token. It asks ZooKeeper for the next token (or a range containing many tokens).
4. Using the token, the server runs the Base62 hash generator (hashGenerator(n)) to create the short code.
5. The server persists { Hash, OriginalUrl, Visits, CreatedAt, ExpiresAt } to MongoDB and caches the mapping in Redis (setEx TTL 600s).
6. The response returns the short `Hash` to the client.

### Token allocation scheme

- ZooKeeper stores a monotonically increasing number at a known znode (commonly `/token`).
- When a node requests tokens, ZooKeeper atomically increments that stored value and returns a start value for a block (for example, ranges of 1,000,000 tokens per allocation is a common configuration in this repo).
- The server receives a range: [start, start + blockSize - 1]. The server then uses numbers from that range locally for subsequent URL creations, reducing ZooKeeper round trips.

Example (conceptual):

- ZooKeeper `/token` currently = 1,000,000.
- Node A requests a block; ZooKeeper updates `/token` -> 2,000,000 and returns the start 1,000,000 to Node A.
- Node A uses tokens 1,000,000 .. 1,999,999 locally to create short codes.

This ensures uniqueness because ZooKeeper guarantees the atomic update of `/token`.

### Where ZooKeeper is used in the codebase

- Helper: `server/src/helpers/zookeeper.js` — contains the logic to connect to ZooKeeper, request the next token or range, and expose a `hashGenerator(n)` function that converts numeric tokens to Base62 strings.
- Controller: `server/src/controllers/zkController.js` — uses the helper when creating new short URLs.
- There is also an endpoint (`GET /del` in `routes/main.js` → `zkController.tokenDelete`) used to remove or reset znode state for maintenance/testing in the project.

### How numeric token → short hash works

- The numeric token is converted with a Base62 encoder (characters 0-9, A-Z, a-z). This makes the final short code compact and URL-safe without special characters.
- The mapping is stable: the same numeric token always maps to the same short code.

### Behavior when ZooKeeper is unavailable

- The project uses a connection wait strategy (for example, a `waitForConnection` helper) so that the server will wait until ZooKeeper becomes available before attempting to request tokens. This avoids returning duplicates or failing silently.
- If ZooKeeper cannot be reached for an extended time, new URL creation requests that require fresh tokens will be blocked or will fail — depending on timeout configuration. Existing cached items (Redis) and previously allocated local ranges continue to work.

Practical note: don't rely on ZooKeeper for low-latency per-request operations. The range allocation pattern is used to reduce ZooKeeper traffic and keep the request path fast.

### Concurrency and scaling

- Multiple node-server instances can safely allocate disjoint token ranges from ZooKeeper. Each instance uses its allocated range locally without needing coordination for each new URL.
- When a node exhausts its local range, it contacts ZooKeeper again and atomically claims the next range.

This pattern scales well: ZooKeeper operations are infrequent (only on range exhaustion) and quick because they're simple atomic increments.

### Token cleanup, rebalancing, and the `/del` endpoint

- The repo includes a `GET /del` route (controller `tokenDelete`) intended to delete or reset the ZooKeeper token node for maintenance or testing. Use this with care — resetting tokens in a production system can cause duplicate numeric tokens if not coordinated with DB state.

### Gotchas and implementation details to watch for

- Range size choice: too small → frequent ZooKeeper calls; too large → wasted tokens if nodes die before using them. The repository uses a large default range (1M) to minimize ZooKeeper calls.
- If a node crashes after taking a range but before using it, those tokens are effectively lost (they won't be re-issued). This is usually acceptable because the numeric space is large; choose a block size that balances loss vs. ZooKeeper load.
- Field name consistency: some workers check `url.ExpirationDate` while the schema uses `ExpiresAt`. Keep model field names consistent across code (mentioned in project notes).

### Testing and validation tips

- Unit test the Base62 encoder: confirm round-trip uniqueness for a set of sample integers.
- Integration test allocation: run two local API instances and confirm allocated token ranges are non-overlapping and persist to Mongo correctly.
- Simulate ZooKeeper downtime: verify the server waits (or fails gracefully) and cached lookups still succeed.

### Monitoring and observability recommendations

- Monitor ZooKeeper connection health and latency (ZK client exposes connection events).
- Track the `/token` znode value occasionally and alert on unexpected jumps.
- Instrument how often nodes request new ranges to detect if block sizes are too small.

### Quick checklist for maintainers

- Don't reset `/token` lightly in production.
- Use sensible range sizes for your traffic pattern.
- Ensure workers and cleanup scripts reference the same model field names.
- Log and alert on ZooKeeper connection failures and range-allocation errors.

---

If you want, I can also add a small diagram image, a test script to simulate two nodes requesting ranges, or a short README section showing how to run ZooKeeper locally with docker-compose used in this repo.
