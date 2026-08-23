import { head } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const pathname = String(req.query?.pathname || '').trim();
    const token = String(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN || '').trim();
    if (!pathname) return res.status(400).json({ error: 'pathname is required' });
    if (!token) return res.status(500).json({ error: 'Public media Blob store is not configured.' });
    if (pathname.includes('..') || pathname.startsWith('http://') || pathname.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid Blob pathname.' });
    }

    const blob = await head(pathname, { token });
    const contentType = String(blob?.contentType || '').trim();
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return res.status(415).json({ error: `Blob returned unsupported content type: ${contentType || 'unknown'}` });
    }

    const upstream = await fetch(blob.url, { headers: { Accept: contentType } });
    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).json({ error: `Blob source fetch returned HTTP ${upstream.status || 0}.` });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    if (blob.size) res.setHeader('Content-Length', String(blob.size));
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (blob.etag) res.setHeader('ETag', blob.etag);
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  } catch (error) {
    console.error('[BLOB-SOURCE]', error);
    return res.status(404).json({ error: error instanceof Error ? error.message : 'Blob source could not be read.' });
  }
}
