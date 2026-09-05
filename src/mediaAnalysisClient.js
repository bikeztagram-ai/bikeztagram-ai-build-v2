/* BIKEZTAGRAM AI — universal browser-local media analysis client. */
import { analyseLocalMedia } from './localMediaAnalysis.js';

export async function analyseMedia({ url, file = null, pathname = '', filename = 'media', mimeType = '', prompt = '' } = {}) {
  const mediaType = String(mimeType || file?.type || '').toLowerCase();
  if (!url && !file) throw new Error('A media source is required for analysis.');
  if (!mediaType.startsWith('image/') && !mediaType.startsWith('video/')) throw new Error(`Unsupported media type: ${mediaType || 'unknown'}`);
  let source = file;
  if (!source) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not read media locally (HTTP ${response.status}).`);
    const blob = await response.blob();
    source = new File([blob], filename || 'media', { type: mediaType || blob.type || 'application/octet-stream' });
  }
  return analyseLocalMedia([source], prompt);
}
