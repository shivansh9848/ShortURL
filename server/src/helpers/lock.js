const client = require("./redis").client;

// Distributed lock with timeout
async function acquireLock(key, ttl = 5000) {
  // SETNX returns 1 if lock acquired, 0 if already locked
  const result = await client.set(key, "locked", "NX", "PX", ttl);
  return result === "OK";
}

async function releaseLock(key) {
  await client.del(key);
}

module.exports = { acquireLock, releaseLock };
