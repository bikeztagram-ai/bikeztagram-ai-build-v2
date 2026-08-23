import { head } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const pathname = String(body?.pathname || '').trim();
    const token = String(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN || '').trim();
    if (!pathname) return res.status(400).json({ error: 'pathname is required' });
    if (!token) return res.status(500).json({ error: 'Public media Blob store is not configured.' });

    const blob = await head(pathname, { token });
    const contentType = String(blob?.contentType || '').trim();
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return res.status(415).json({ error: `Verified Blob has unsupported content type: ${contentType || 'unknown'}` });
    }

    return res.status(200).json({
      ok: true,
      pathname: blob.pathname || pathname,
      url: blob.url,
      downloadUrl: blob.downloadUrl || blob.url,
      contentType,
      size: Number(blob.size || 0),
      uploadedAt: blob.uploadedAt || null,
    });
  } catch (error) {
    console.error('[BLOB-VERIFY]', error);
    return res.status(404).json({
      error: error instanceof Error ? `Uploaded Blob could not be verified: ${error.message}` : 'Uploaded Blob could not be verified.',
    });
  }
}
