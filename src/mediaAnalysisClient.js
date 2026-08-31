/* BIKEZTAGRAM AI — universal browser-local media analysis client. */
import { analyseMediaLocally } from './localMediaAnalysis.js';

export async function analyseMedia({ url, file = null, pathname = '', filename = 'media', mimeType = '', prompt = '' } = {}) {
  const mediaType = String(mimeType || file?.type || '').toLowerCase();
  if (!url && !file) throw new Error('A media source is required for analysis.');
  if (!mediaType.startsWith('image/') && !mediaType.startsWith('video/')) throw new Error(`Unsupported media type: ${mediaType || 'unknown'}`);
  return analyseMediaLocally({ url, file, pathname, filename, mimeType: mediaType, prompt });
}
