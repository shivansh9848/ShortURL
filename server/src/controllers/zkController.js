const ShortURL = require('../models/url');
const { connectRedis, jobQueue } = require('../helpers/redis');
const { range, hashGenerator, getTokenRange, removeToken } = require('../helpers/zookeeper');

let redisClient;

// ✅ Initialize Redis connection only once
(async () => {
  redisClient = await connectRedis();
  console.log('✅ Redis client initialized in zkController');
})();

// POST /url
let urlPost = async (req, res) => {
  try {
    if (!req.body.OriginalUrl) {
      return res.status(400).json({ error: "Missing OriginalUrl" });
    }

    // Get next token from Zookeeper
    if (range.curr < range.end - 1 && range.curr !== 0) {
      range.curr++;
    } else {
      await getTokenRange();
      range.curr++;
    }

    console.log(`Token: ${range.curr}`);

    // Check Redis cache first
    const cached = await new Promise((resolve, reject) => {
      redisClient.get(req.body.OriginalUrl, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    if (cached) {
      console.log('Cache hit');
      return res.json({ Hash: cached });
    }

    // Check DB for existing URL
    const existing = await ShortURL.findOne({ OriginalUrl: req.body.OriginalUrl });
    if (existing) {
      redisClient.setex(req.body.OriginalUrl, 600, existing.Hash);
      return res.json({ Hash: existing.Hash });
    }

    // Generate unique hash
    let hash = hashGenerator(range.curr - 1);
    let urlDoc;

    try {
      urlDoc = await ShortURL.create({
        Hash: hash,
        OriginalUrl: req.body.OriginalUrl,
        Visits: 0,
        CreatedAt: new Date(),
        ExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    } catch (err) {
      if (err.code === 11000) {
        console.warn(`Duplicate hash "${hash}", retrying with new hash...`);
        hash = hashGenerator(Date.now() % 1e9);
        urlDoc = await ShortURL.create({
          Hash: hash,
          OriginalUrl: req.body.OriginalUrl,
          Visits: 0,
          CreatedAt: new Date(),
          ExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      } else {
        throw err;
      }
    }

    redisClient.setex(req.body.OriginalUrl, 600, urlDoc.Hash);
    res.json({ Hash: urlDoc.Hash });
  } catch (error) {
    console.error('❌ URL creation failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /url/:identifier
let urlGet = async (req, res) => {
  try {
    const url = await ShortURL.findOne({ Hash: req.params.identifier });
    if (!url) return res.status(404).send('URL not found');

    jobQueue.enqueue(url.Hash);
    res.redirect(url.OriginalUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching URL');
  }
};

// DELETE /token
let tokenDelete = async (req, res) => {
  try {
    await removeToken();
    res.send('Token deleted');
  } catch (error) {
    res.status(500).send('Failed to remove token');
  }
};

module.exports = { urlPost, urlGet, tokenDelete };
