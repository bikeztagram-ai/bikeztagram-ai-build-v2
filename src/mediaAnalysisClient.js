/* BIKEZTAGRAM AI — universal media-analysis client.
   One client contract for images and video; the server chooses the correct Gemini path. */

export async function analyseMedia({ url, pathname = '', filename = 'media', mimeType = '', prompt = '' }) {
  if (!url) throw new Error('A public media URL is required for analysis.');
  if (!String(mimeType).startsWith('image/') && !String(mimeType).startsWith('video/')) {
    throw new Error(`Unsupported media type: ${mimeType || 'unknown'}`);
  }
  const response = await fetch('/api/analyse-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaUrl: url,
      imageUrl: mimeType.startsWith('image/') ? url : '',
      videoUrl: mimeType.startsWith('video/') ? url : '',
      pathname,
      filename,
      mimeType,
      prompt
    })
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Media analysis returned invalid JSON: ${text.slice(0, 500)}`); }
  if (!response.ok || !data?.success) throw new Error(data?.error || `Media analysis failed with HTTP ${response.status}`);
  if (!data.analysis) throw new Error('Media analysis returned no universal analysis.');
  return data.analysis;
}
