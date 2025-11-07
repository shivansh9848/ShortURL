const client = require("../helpers/redis").client;
const { acquireLock, releaseLock } = require("../helpers/lock");

async function purgeAliases() {
  // Try to get lock for this task
  const gotLock = await acquireLock("purge_alias_lock", 10000); // 10 seconds lock timeout

  if (!gotLock) {
    // Another node-server instance is already running purge
    return;
  }

  console.log("🔥 Running alias cleanup...");

  try {
    // Example: delete expired short URLs
    const now = Date.now();
    await client.zremrangebyscore("aliases_expiry", 0, now);

  } catch (err) {
    console.error("Error in purge worker:", err);
  } finally {
    await releaseLock("purge_alias_lock");
  }
}

module.exports = purgeAliases;
