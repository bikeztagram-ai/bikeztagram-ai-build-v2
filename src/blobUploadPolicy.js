// Bikeztagram AI — Blob upload policy.
// Keep the proven client-upload route, but use Vercel Blob multipart uploads
// for larger media so large transfers get parallel parts and retry support.
export function getBlobUploadOptions(file) {
  const isVideo = String(file?.type || '').startsWith('video/');
  const useMultipart = Boolean(file?.size && file.size >= 5 * 1024 * 1024) || isVideo;
  return { multipart: useMultipart };
}
