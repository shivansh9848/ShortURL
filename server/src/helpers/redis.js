require('dotenv').config();
const redis = require('redis');
const ShortURL = require('../models/url');

class Queue {
  constructor() {
    this.items = [];
  }

  enqueue = async (element) => {
    if (this.size() < 10) {
      this.items.push(element);
    } else {
      while (!this.isEmpty()) {
        await ShortURL.findOneAndUpdate(
          { Hash: this.dequeue() },
          { $inc: { Visits: 1 } }
        ).catch((err) => console.log(err));
      }
    }
  };

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}

let jobQueue = new Queue();

// ✅ Redis v2 style client (no .connect())
let client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

client.on('connect', () => {
  console.log('✅ Redis Connected (v2 client)');
});

client.on('error', (err) => {
  console.log('❌ Redis Error:', err.message);
});

const connectRedis = async () => {
  // v2 doesn't need await connect — just return client
  return client;
};

module.exports = { jobQueue, connectRedis, client };
