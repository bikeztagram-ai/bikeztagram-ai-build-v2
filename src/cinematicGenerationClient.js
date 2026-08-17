/* BIKEZTAGRAM AI — client-side cinematic generation bridge. £0-only. */

export async function generateCinematicShot({ prompt, durationSeconds = 4, aspectRatio = '16:9', referenceAssets = [], continuity = null, shotId = null, onProgress, signal } = {}) {
  if (!prompt || !String(prompt).trim()) throw new Error('A cinematic shot prompt is required.');
  if (signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError');

  onProgress?.({ stage: 'queued', percent: 5, shotId });
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError');
    try {
      const response = await fetch('/api/generate-free-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ prompt: String(prompt).trim(), durationSeconds, aspectRatio, referenceAssets, continuity, shotId, zeroCostOnly: true }),
      });

      onProgress?.({ stage: 'worker-response', percent: 60, shotId, attempt: attempt + 1 });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try { message = JSON.parse(text)?.error || text; } catch {}
        const error = new Error(`Cinematic generation failed (HTTP ${response.status}): ${String(message).slice(0, 700)}`);
        if (!isTransientStatus(response.status) || attempt === 1) throw error;
        lastError = error;
        onProgress?.({ stage: 'retrying', percent: 10, shotId, attempt: attempt + 1 });
        await delay(750, signal);
        continue;
      }
      if (!contentType.includes('video/')) throw new Error(`Cinematic generation returned ${contentType || 'unknown content'} instead of video.`);
      const blob = await response.blob();
      if (!(blob instanceof Blob) || blob.size === 0) throw new Error('Cinematic generation returned an empty video.');
      onProgress?.({ stage: 'complete', percent: 100, shotId, bytes: blob.size });
      return blob;
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      lastError = error;
      if (attempt === 1 || !isTransientError(error)) throw error;
      onProgress?.({ stage: 'retrying', percent: 10, shotId, attempt: attempt + 1 });
      await delay(750, signal);
    }
  }
  throw lastError || new Error('Cinematic generation failed.');
}

export async function generateCinematicTrailer({ shots = [], referenceAssets = [], continuity = null, onShotProgress, onProgress, signal } = {}) {
  if (!Array.isArray(shots) || shots.length === 0) throw new Error('At least one cinematic shot is required.');
  const results = [];
  for (let index = 0; index < shots.length; index += 1) {
    if (signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError');
    const shot = shots[index];
    const blob = await generateCinematicShot({
      prompt: shot.generationPrompt || shot.prompt,
      durationSeconds: shot.duration || 4,
      aspectRatio: shot.aspectRatio || '16:9',
      referenceAssets: shot.referenceAssets || referenceAssets,
      continuity: shot.continuity || continuity,
      shotId: shot.id || `shot-${index + 1}`,
      signal,
      onProgress: (event) => {
        onShotProgress?.({ ...event, index, total: shots.length });
        const overall = Math.round(((index + (event.percent || 0) / 100) / shots.length) * 100);
        onProgress?.(overall);
      },
    });
    results.push({ ...shot, index, blob });
  }
  return results;
}

function isTransientStatus(status) {
  return [408, 425, 429, 502, 503, 504].includes(Number(status));
}

function isTransientError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('failed to fetch') || message.includes('network') || message.includes('timeout');
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const abort = () => { clearTimeout(timer); reject(new DOMException('Generation cancelled.', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
  });
}
