import { handleUpload } from '@vercel/blob/client';

const ALLOWED = ['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = String(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN || '').trim();
    if (!token) return res.status(500).json({ error: 'Public media Blob store is not configured. Expected PUBLIC_BLOB_READ_WRITE_TOKEN in this Vercel environment.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const jsonResponse = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ALLOWED,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[PUBLIC-BLOB] upload completed', blob?.url || blob?.pathname);
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[PUBLIC-BLOB] client upload handler failed', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
