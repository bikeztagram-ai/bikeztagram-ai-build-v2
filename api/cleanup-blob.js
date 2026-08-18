import { del, list } from '@vercel/blob';

const TEMP_PREFIX = 'videos/';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function authorised(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const now = Date.now();
    let cursor;
    let scanned = 0;
    let deleted = 0;

    do {
      const result = await list({ prefix: TEMP_PREFIX, cursor, limit: 250 });
      for (const blob of result.blobs) {
        scanned += 1;
        const uploadedAt = new Date(blob.uploadedAt).getTime();
        if (Number.isFinite(uploadedAt) && now - uploadedAt >= MAX_AGE_MS) {
          await del(blob.url);
          deleted += 1;
        }
      }
      cursor = result.cursor;
    } while (cursor);

    return res.status(200).json({ ok: true, scanned, deleted, maxAgeHours: 24 });
  } catch (error) {
    console.error('Bikeztagram Blob cleanup failed:', error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Blob cleanup failed' });
  }
}
