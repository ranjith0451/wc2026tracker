// Vercel serverless function — reads/writes results via Upstash Redis.
// REDIS_URL is set automatically when you connect the Redis store in Vercel.
//
// Security: POST is gated by ADMIN_TOKEN (set on Vercel as an env var).
// The client sends it as the `X-Admin-Token` header. If ADMIN_TOKEN is not
// configured on the server, ALL writes are rejected — fail closed.
// Comparison is constant-time to avoid token-timing oracles.

import Redis from 'ioredis';
import { timingSafeEqual } from 'node:crypto';

const KEY = 'wc2026_results';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

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

function tokenMatches(provided) {
  if (!ADMIN_TOKEN) return false; // fail closed
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POSTs require the admin token. GET stays public so the live tracker keeps
  // working for everyone; only writes are gated.
  if (req.method === 'POST') {
    if (!ADMIN_TOKEN) {
      return res.status(503).json({
        error: 'admin_not_configured',
        message: 'Server has no ADMIN_TOKEN set; writes are disabled.',
      });
    }
    if (!tokenMatches(req.headers['x-admin-token'])) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const redis = getRedis();
  if (!redis) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      // We already passed auth above, so this is a config problem, not a permission one.
      return res.status(503).json({
        error: 'storage_not_configured',
        message: 'Server has no REDIS_URL set; cannot persist writes.',
      });
    }
    return res.status(200).json({});
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis.get(KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(raw ? JSON.parse(raw) : {});
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (typeof body !== 'object' || body === null) {
        return res.status(400).json({ error: 'Body must be a JSON object' });
      }
      // Cap payload size to 1 MB — this is match-result data, no legitimate reason to exceed.
      const serialized = JSON.stringify(body);
      if (serialized.length > 1_000_000) {
        return res.status(413).json({ error: 'payload_too_large' });
      }
      await redis.set(KEY, serialized);
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('[/api/results]', e.message);
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(500).json({ error: e.message });
  } finally {
    redis.disconnect();
  }
}
