// Bikeztagram AI — Blob upload policy.
// Use the proven client-upload route, but switch larger media to multipart
// uploads so Vercel Blob can parallelize parts and retry failed parts.
export function getBlobUploadOptions(file) {
  const isVideo = String(file?.type || '').startsWith('video/');
  const useMultipart = Boolean(file?.size && file.size >= 5 * 1024 * 1024) || isVideo;
  return { multipart: useMultipart };
}
