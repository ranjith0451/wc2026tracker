// Vercel serverless function — GET reads from KV, POST writes to KV.
// Requires: Vercel KV store connected to this project (sets KV_REST_API_URL +
// KV_REST_API_TOKEN automatically). See README or Admin page for setup steps.

import { kv } from '@vercel/kv';

const KEY = 'wc2026_results';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Graceful fallback when KV is not yet configured (local dev or unconfigured)
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({});
    }
    return res.status(503).json({ error: 'KV not configured — add Vercel KV store to this project' });
  }

  try {
    if (req.method === 'GET') {
      const data = await kv.get(KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data ?? {});
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (typeof body !== 'object' || body === null) {
        return res.status(400).json({ error: 'Body must be a JSON object' });
      }
      await kv.set(KEY, body);
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('[/api/results]', e);
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(500).json({ error: 'Storage error' });
  }
}
