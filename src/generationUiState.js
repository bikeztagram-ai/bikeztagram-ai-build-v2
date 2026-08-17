/* BIKEZTAGRAM AI — prompt-to-video UI state machine. */

export const GENERATION_STATES = Object.freeze({
  IDLE: 'idle',
  PLANNING: 'planning',
  GENERATING: 'generating',
  IMPORTING: 'importing',
  READY: 'ready',
  FAILED: 'failed',
});

export function createGenerationState(overrides = {}) {
  return {
    status: GENERATION_STATES.IDLE,
    jobId: null,
    progress: 0,
    message: 'Ready to create',
    videoUrl: null,
    error: null,
    ...overrides,
  };
}

export function generationStateFromStatus(job = {}) {
  const status = String(job.status || '').toLowerCase();
  if (status === 'complete' || status === 'completed' || status === 'done') {
    return createGenerationState({ status: GENERATION_STATES.READY, jobId: job.id || null, progress: 100, message: 'Video ready', videoUrl: job.videoUrl || null });
  }
  if (status === 'failed' || status === 'error') {
    return createGenerationState({ status: GENERATION_STATES.FAILED, jobId: job.id || null, message: 'Generation failed', error: job.error || 'Video generation failed' });
  }
  return createGenerationState({ status: GENERATION_STATES.GENERATING, jobId: job.id || null, progress: Math.max(5, Math.min(95, Number(job.progress) || 10)), message: job.message || 'Creating your video…' });
}
