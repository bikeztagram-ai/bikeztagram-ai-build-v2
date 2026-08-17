/* BIKEZTAGRAM AI — provider-neutral prompt-to-video job orchestration. */

export const GENERATION_STATES = Object.freeze({
  QUEUED: 'queued',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
});

export function createGenerationJob({ prompt, duration = 8, aspectRatio = '9:16', model = 'veo-3.1-fast-generate-preview' } = {}) {
  if (!String(prompt || '').trim()) throw new Error('A creative prompt is required');
  return {
    id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    state: GENERATION_STATES.QUEUED,
    prompt: String(prompt).trim(),
    duration: Math.max(1, Math.min(60, Number(duration) || 8)),
    aspectRatio,
    model,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
}

export function markGenerationRunning(job) {
  return { ...job, state: GENERATION_STATES.GENERATING, attempts: (job.attempts || 0) + 1 };
}

export function markGenerationReady(job, video) {
  return { ...job, state: GENERATION_STATES.READY, video: video || null, completedAt: new Date().toISOString() };
}

export function markGenerationFailed(job, error) {
  return { ...job, state: GENERATION_STATES.FAILED, error: String(error || 'Video generation failed'), completedAt: new Date().toISOString() };
}

export function generationCanBeImported(job) {
  return job?.state === GENERATION_STATES.READY && Boolean(job?.video?.url);
}
