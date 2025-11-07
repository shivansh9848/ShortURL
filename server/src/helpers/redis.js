const redis = require("redis");

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

client.on("connect", () => console.log("✅ Redis Connected"));
client.on("error", (err) => console.error("❌ Redis Error:", err));

module.exports = { client };
