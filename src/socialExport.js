/* BIKEZTAGRAM AI — social export helpers.
   Keeps the existing renderer untouched while making the finished browser Blob easy to save/share.
   The current renderer is portrait 1080x1920 (9:16), suitable for Reels/TikTok/Shorts.
*/

const safeFilename = (value) => String(value || 'bikeztagram-ai-film')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'bikeztagram-ai-film';

export const SOCIAL_PRESETS = Object.freeze({
  portrait: {
    id: 'portrait',
    label: '9:16 Social — Reels / TikTok / Shorts',
    width: 1080,
    height: 1920,
    extension: 'webm',
    mimeType: 'video/webm'
  }
});

export function getSocialExportInfo(blob, presetId = 'portrait') {
  const preset = SOCIAL_PRESETS[presetId] || SOCIAL_PRESETS.portrait;
  const mime = String(blob?.type || '').toLowerCase();
  const extension = mime.includes('mp4') ? 'mp4' : preset.extension;
  return {
    ...preset,
    mimeType: blob?.type || preset.mimeType,
    extension,
    sizeBytes: Number(blob?.size || 0),
    formatLabel: extension.toUpperCase()
  };
}

export function downloadSocialFilm(blob, { presetId = 'portrait', name = 'bikeztagram-ai-film' } = {}) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error('No finished film is available to export.');
  const info = getSocialExportInfo(blob, presetId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFilename(name)}-${info.width}x${info.height}.${info.extension}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return info;
}

export async function shareSocialFilm(blob, { presetId = 'portrait', name = 'bikeztagram-ai-film' } = {}) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error('No finished film is available to share.');
  if (!navigator.share) throw new Error('This device/browser does not provide native sharing.');
  const info = getSocialExportInfo(blob, presetId);
  const file = new File([blob], `${safeFilename(name)}-${info.width}x${info.height}.${info.extension}`, { type: info.mimeType });
  if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error('This device cannot share the rendered video file directly.');
  await navigator.share({ title: 'Bikeztagram AI film', text: 'Created with Bikeztagram AI', files: [file] });
  return info;
}
