/* BIKEZTAGRAM AI — generative video provider abstraction.
 * No source media is required: a creative prompt can become a generated clip.
 * Credentials stay server-side; the UI should call the server adapter, never expose API keys.
 */

export function normalizeGenerationRequest(input = {}) {
  const prompt = String(input.prompt || '').trim();
  if (!prompt) throw new Error('A video prompt is required');

  return {
    prompt,
    model: input.model || process.env.VIDEO_GENERATION_MODEL || 'veo-3.1-generate-preview',
    aspectRatio: input.aspectRatio === '16:9' ? '16:9' : '9:16',
    resolution: ['720p', '1080p', '4k'].includes(input.resolution) ? input.resolution : '720p',
    durationSeconds: Math.max(4, Math.min(60, Number(input.durationSeconds) || 8)),
    generateAudio: input.generateAudio !== false,
  };
}

export async function generateVideoFromPrompt(request, deps = {}) {
  const config = normalizeGenerationRequest(request);
  const generate = deps.generate;
  if (typeof generate !== 'function') {
    throw new Error('Video generation provider is not configured');
  }
  return generate(config);
}

export function createProviderResult({ id, status = 'queued', videoUrl = null, provider = 'unknown', error = null } = {}) {
  return { id: id || null, status, videoUrl, provider, error };
}
