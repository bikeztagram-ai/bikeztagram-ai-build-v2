/* BIKEZTAGRAM AI — client-side cinematic generation bridge. £0-only. */

export async function generateCinematicShot({ prompt, durationSeconds = 4, aspectRatio = '16:9', referenceAssets = [], continuity = null, shotId = null, onProgress } = {}) {
  if (!prompt || !String(prompt).trim()) throw new Error('A cinematic shot prompt is required.');

  onProgress?.({ stage: 'queued', percent: 5, shotId });

  const response = await fetch('/api/generate-free-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: String(prompt).trim(),
      durationSeconds,
      aspectRatio,
      referenceAssets,
      continuity,
      shotId,
      zeroCostOnly: true,
    }),
  });

  onProgress?.({ stage: 'worker-response', percent: 60, shotId });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { message = JSON.parse(text)?.error || text; } catch {}
    throw new Error(`Cinematic generation failed (HTTP ${response.status}): ${String(message).slice(0, 700)}`);
  }
  if (!contentType.includes('video/')) {
    throw new Error(`Cinematic generation returned ${contentType || 'unknown content'} instead of video.`);
  }

  const blob = await response.blob();
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error('Cinematic generation returned an empty video.');

  onProgress?.({ stage: 'complete', percent: 100, shotId, bytes: blob.size });
  return blob;
}

export async function generateCinematicTrailer({ shots = [], referenceAssets = [], continuity = null, onShotProgress, onProgress } = {}) {
  if (!Array.isArray(shots) || shots.length === 0) throw new Error('At least one cinematic shot is required.');

  const results = [];
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const blob = await generateCinematicShot({
      prompt: shot.generationPrompt || shot.prompt,
      durationSeconds: shot.duration || 4,
      aspectRatio: shot.aspectRatio || '16:9',
      referenceAssets: shot.referenceAssets || referenceAssets,
      continuity: shot.continuity || continuity,
      shotId: shot.id || `shot-${index + 1}`,
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
