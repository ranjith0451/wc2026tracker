// Vercel serverless function — reads/writes results via Upstash Redis.
// REDIS_URL is set automatically when you connect the Redis store in Vercel.

import Redis from 'ioredis';

const KEY = 'wc2026_results';

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

function parseBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return req.body;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const redis = getRedis();
  if (!redis) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'REDIS_URL not configured' });
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis.get(KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(raw ? JSON.parse(raw) : {});
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      if (typeof body !== 'object' || body === null) {
        return res.status(400).json({ error: 'Body must be a JSON object' });
      }
      await redis.set(KEY, JSON.stringify(body));
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('[/api/results]', e.message);
    if (req.method === 'GET') return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: e.message });
  } finally {
    redis.disconnect();
  }
}
