import { get } from '@vercel/blob';

const text = (value) => String(value ?? '').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const token = text(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN);
    const pathname = text(req.body?.pathname);
    const expectedType = text(req.body?.mimeType);
    if (!token) return res.status(500).json({ success: false, error: 'PUBLIC_BLOB_READ_WRITE_TOKEN is missing.' });
    if (!pathname) return res.status(400).json({ success: false, error: 'Blob pathname is required.' });
    if (pathname.includes('..') || pathname.startsWith('/') || pathname.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid Blob pathname.' });
    }

    const result = await get(pathname, { access: 'public', token, useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return res.status(404).json({ success: false, error: 'Canonical public Blob object was not found.', pathname });
    }

    const contentType = text(result.blob?.contentType);
    const size = Number(result.blob?.size || 0);
    if (expectedType && contentType && contentType !== expectedType) {
      return res.status(409).json({ success: false, error: `Blob content type mismatch: expected ${expectedType}, received ${contentType}.`, pathname });
    }

    return res.status(200).json({ success: true, verified: true, store: 'canonical-public', pathname, contentType, size });
  } catch (error) {
    console.error('[BLOB-VERIFY]', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Canonical public Blob verification failed.' });
  }
}
