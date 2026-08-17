/* BIKEZTAGRAM AI — trailer output lifecycle helpers. £0-only. */

export function createTrailerOutput(blob, metadata = {}) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error('A non-empty trailer video is required.');
  const url = URL.createObjectURL(blob);
  return { blob, url, mimeType: blob.type || 'video/webm', sizeBytes: blob.size, createdAt: new Date().toISOString(), ...metadata };
}

export function revokeTrailerOutput(output) {
  if (output?.url) URL.revokeObjectURL(output.url);
}

export function downloadTrailerOutput(output, filename = 'bikeztagram-cinematic-trailer.webm') {
  if (!output?.blob || !output?.url) throw new Error('Trailer output is not ready.');
  const anchor = document.createElement('a');
  anchor.href = output.url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function getTrailerOutputSummary(output) {
  if (!output) return null;
  return { mimeType: output.mimeType, sizeBytes: output.sizeBytes, sizeMb: Math.round((output.sizeBytes / 1048576) * 10) / 10, createdAt: output.createdAt };
}
