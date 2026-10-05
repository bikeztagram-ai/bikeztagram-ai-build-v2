import { issueSignedToken, presignUrl } from '@vercel/blob';

export const maxDuration = 10;

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'OK', blobImports: typeof issueSignedToken === 'function' && typeof presignUrl === 'function' }));
}
