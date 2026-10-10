const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const absolute = (base, value) => {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return base + value;
  return base + '/' + value;
};
function parseSSE(text) {
  const events = text.split(/\r?\n\r?\n/);
  let complete = null;
  for (const event of events) {
    const type = event.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const dataLine = event.split(/\r?\n/).find((line) => line.startsWith('data:'));
    if (!dataLine) continue;
    const raw = dataLine.slice(5).trim();
    if (type === 'error') throw new Error(raw || 'Hugging Face Space generation failed.');
    if (type === 'complete') { try { complete = JSON.parse(raw); } catch { throw new Error('Space returned an unreadable result.'); } }
  }
  if (!complete) throw new Error('Space queue ended without a completed video result.');
  return complete;
}
function fileData(value) {
  if (typeof value === 'string') return { path: value, meta: { _type: 'gradio.FileData' } };
  return value;
}
async function uploadReference(base, dataUri) {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('Reference image is not a supported data URI.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: match[1] });
  const form = new FormData();
  form.append('files', blob, match[1].includes('png') ? 'reference.png' : 'reference.jpg');
  const response = await fetch(base + '/gradio_api/upload', { method: 'POST', body: form });
  if (!response.ok) throw new Error('Could not upload the reference image to the configured Hugging Face Space.');
  const uploaded = await response.json();
  const path = Array.isArray(uploaded) ? uploaded[0] : uploaded?.path;
  if (!path) throw new Error('Hugging Face Space did not return an uploaded image path.');
  return { path, meta: { _type: 'gradio.FileData' } };
}
function extractVideo(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('Hugging Face Space returned no output data.');
  const first = data[0];
  if (typeof first === 'string') return { path: first };
  if (first && typeof first === 'object') {
    const nested = first.video || first.output_video || first.value;
    if (typeof nested === 'string') return { path: nested };
    if (nested && typeof nested === 'object') return nested;
    return first;
  }
  throw new Error('Hugging Face Space returned an unsupported video result.');
}
export async function generateFromHuggingFaceSpace({spaceUrl,apiName='/generate_video',prompt,duration=2,promptImage='',seed=42,onProgress}={}) {
  const base = String(spaceUrl || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+\.hf\.space$/i.test(base)) throw new Error('Configure HF_VIDEO_SPACE_URL with the public https://<space-subdomain>.hf.space URL.');
  const endpoint = String(apiName || '/generate_video').startsWith('/') ? String(apiName || '/generate_video') : '/' + apiName;
  const image = await uploadReference(base, promptImage);
  const seconds = Math.max(2, Math.min(4, Math.round(Number(duration) || 2)));
  const response = await fetch(base + '/gradio_api/call' + endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [String(prompt || ''), image, seconds, Number(seed) || 42] })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Hugging Face Space refused the generation request (' + response.status + '). ' + detail.slice(0, 240));
  }
  const task = await response.json();
  if (!task?.event_id) throw new Error('Hugging Face Space did not return a queue event ID.');
  onProgress?.(8);
  let result = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const poll = await fetch(base + '/gradio_api/call' + endpoint + '/' + encodeURIComponent(task.event_id), { headers: { Accept: 'text/event-stream' } });
    if (!poll.ok) throw new Error('Could not poll Hugging Face Space queue (' + poll.status + ').');
    const sse = await poll.text();
    try { result = parseSSE(sse); break; } catch (error) { if (attempt === 1) throw error; await wait(1000); }
  }
  onProgress?.(82);
  const video = extractVideo(result?.data || result);
  const remoteUrl = video.url ? absolute(base, video.url) : video.path ? absolute(base, '/gradio_api/file=' + encodeURIComponent(video.path)) : '';
  if (!remoteUrl) throw new Error('Hugging Face Space result has no downloadable video path.');
  const mediaResponse = await fetch(remoteUrl);
  if (!mediaResponse.ok) throw new Error('Generated video exists but could not be downloaded from the Space.');
  const blob = await mediaResponse.blob();
  if (!blob.size || !String(blob.type).startsWith('video/')) throw new Error('Hugging Face Space returned an empty or non-video file.');
  onProgress?.(100);
  return { blob, videoBlob: blob, source: 'huggingface-zerogpu-wan', provider: 'Hugging Face ZeroGPU (Wan 2.2 TI2V 5B)', model: 'Wan2.2-TI2V-5B-Diffusers', status: 'ready', duration: seconds, mimeType: blob.type, mode: promptImage ? 'image-to-video' : 'text-to-video' };
}
