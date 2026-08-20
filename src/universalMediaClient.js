/* BIKEZTAGRAM AI — universal media intake client.
   One client contract for images and video; preserves the existing Blob upload and Gemini endpoints. */
import { upload } from '@vercel/blob/client';
import { normalizeUniversalAnalysis } from './universalMediaModel.js';

const isSupported = (file) => Boolean(file?.type) && (file.type.startsWith('image/') || file.type.startsWith('video/'));
const safeName = (name) => String(name || 'media').replace(/[^a-zA-Z0-9._-]/g, '_');

export function getUniversalMediaType(file) {
  if (!file?.type) return 'unknown';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'unknown';
}

export function assertUniversalMedia(file) {
  if (!file) throw new Error('Please choose an image or video first.');
  if (!isSupported(file)) throw new Error('Unsupported media type. Choose an image or video file.');
}

export async function uploadAndAnalyseUniversalMedia(file, prompt = '', options = {}) {
  assertUniversalMedia(file);
  const mediaType = getUniversalMediaType(file);
  const folder = mediaType === 'image' ? 'images' : 'videos';
  const pathname = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`;
  const onProgress = typeof options.onUploadProgress === 'function' ? options.onUploadProgress : () => {};

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    multipart: mediaType === 'video' && file.size > 8 * 1024 * 1024,
    clientPayload: JSON.stringify({ source: 'bikeztagram-ai', filename: file.name, mimeType: file.type, size: file.size, mediaType }),
    onUploadProgress: (event) => {
      const value = Number(event?.percentage);
      if (Number.isFinite(value)) onProgress(Math.max(0, Math.min(100, Math.round(value))));
    },
  });

  if (!blob?.url || !blob?.pathname) throw new Error('Vercel Blob upload did not return a valid media URL/pathname.');

  const response = await fetch('/api/analyse-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaUrl: blob.url,
      imageUrl: mediaType === 'image' ? blob.url : '',
      videoUrl: mediaType === 'video' ? blob.url : '',
      pathname: blob.pathname,
      filename: file.name,
      mimeType: file.type,
      prompt,
    }),
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Media analysis returned invalid JSON: ${text.slice(0, 500)}`); }
  if (!response.ok) throw new Error(data?.error || `Media analysis returned HTTP ${response.status}`);
  if (!data?.analysis) throw new Error('Media analysis returned no analysis.');

  return {
    mediaType,
    file,
    blob,
    analysis: normalizeUniversalAnalysis({ ...data.analysis, mediaType }),
  };
}
