import Redis from 'ioredis';

function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const hasStatsApiKey = Boolean(process.env.STATS_API_KEY);
  const redis = getRedis();

  let redisConnected = false;
  let redisError = null;
  if (redis) {
    try {
      const pong = await redis.ping();
      redisConnected = pong === 'PONG';
    } catch (err) {
      redisError = err.message;
    } finally {
      try { redis.disconnect(); } catch {}
    }
  }

  const ok = hasStatsApiKey && redisConnected;
  return res.status(ok ? 200 : 503).json({
    ok,
    environment: {
      hasStatsApiKey,
      hasRedisUrl: Boolean(process.env.REDIS_URL),
      redisConnected,
    },
    redisError,
    timestamp: new Date().toISOString(),
  });
}
