/* BIKEZTAGRAM AI — worker response validation. £0-only. */
export function validateCinematicVideoResponse(response, contentType = '') {
  if (!response?.ok) return { valid: false, reason: `HTTP ${response?.status || 'unknown'}` };
  if (!String(contentType).toLowerCase().startsWith('video/')) return { valid: false, reason: `Expected video response, got ${contentType || 'unknown'}` };
  return { valid: true };
}

export function validateVideoBlob(blob) {
  if (!(blob instanceof Blob) || blob.size <= 0) return { valid: false, reason: 'Empty video blob.' };
  if (!String(blob.type || '').startsWith('video/')) return { valid: false, reason: `Unexpected MIME type: ${blob.type || 'unknown'}` };
  return { valid: true, bytes: blob.size, mimeType: blob.type };
}
