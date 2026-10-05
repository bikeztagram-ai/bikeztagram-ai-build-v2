import { issueSignedToken, presignUrl } from '@vercel/blob';

export const maxDuration = 10;

export default async function handler(req, res) {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'OK', blobImports: typeof issueSignedToken === 'function' && typeof presignUrl === 'function' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error?.message || String(error), name: error?.name || 'Error' }));
  }
}
