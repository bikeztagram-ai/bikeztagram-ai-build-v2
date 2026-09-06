/* Parallel prompt-only generation. Keeps provider calls bounded so multi-shot films build faster. */
import { generateAIVideoScene } from './aiVideoProvider.js';
import { mapWithConcurrency } from './asyncPool.js';

const ratioForPreset = (preset = 'portrait') => preset === 'square' ? '960:960' : preset === 'landscape' || preset === 'cinema' ? '1280:720' : '720:1280';
const buildPrompt = ({ creativePrompt, cut }) => {
  const intent = cut?.creativeIntent || {};
  const subject = intent.subject || cut?.subject || 'the main subject';
  const world = intent.world || cut?.world || 'the requested environment';
  const role = cut?.purpose || intent.role || 'cinematic shot';
  const action = Array.isArray(cut?.action) ? cut.action.join(', ') : String(cut?.action || 'natural purposeful movement');
  const motion = cut?.motionStyle || intent.camera?.movement || 'subtle natural camera movement';
  const lighting = Array.isArray(intent.lighting) ? intent.lighting.join(', ') : String(intent.lighting || 'cinematic lighting');
  const style = intent.directives?.style || intent.style || 'cinematic';
  return [creativePrompt || 'Create a premium cinematic audiovisual scene.', `Generate a real moving video shot for the ${role}.`, `Subject: ${subject}. Environment: ${world}. Action: ${action}.`, `Camera: ${motion}. Lighting: ${lighting}. Visual language: ${style}.`, 'Invent the complete scene faithfully from the creative brief while maintaining subject, world and visual continuity.', 'Natural purposeful motion, believable physics, coherent temporal movement and premium commercial cinematography.', 'Do not add unrelated objects, text, logos or watermarks unless explicitly requested.'].join(' ');
};

export async function generatePromptOnlyVideoCutsParallel({ plan, creativePrompt = '', outputPreset = 'portrait', maxGeneratedCuts = 6, concurrency = 3, onProgress } = {}) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  const jobs = cuts.slice(0, Math.min(cuts.length, Math.max(1, Number(maxGeneratedCuts) || 6)));
  let completed = 0;
  const results = await mapWithConcurrency(jobs, concurrency, async (cut, index) => {
    const duration = Math.max(2, Math.min(10, Number(cut?.duration) || 5));
    const generationPrompt = buildPrompt({ creativePrompt, cut });
    try {
      const result = await generateAIVideoScene({ prompt: generationPrompt, duration, ratio: ratioForPreset(outputPreset), onProgress: (value) => onProgress?.({ stage: 'ai-video', value: Math.round(((completed + value / 100) / Math.max(1, jobs.length)) * 100), current: index + 1, total: jobs.length, mode: 'text-to-video' }) });
      if (!result?.blob) throw new Error('AI video provider returned no video.');
      completed += 1;
      const id = `generated-text-video-${index}-${Date.now()}`;
      const url = URL.createObjectURL(result.blob);
      cut.mediaId = id;
      cut.generatedMediaId = id;
      cut.generated = true;
      cut.mediaIndex = index;
      onProgress?.({ stage: 'ai-video', value: Math.round((completed / Math.max(1, jobs.length)) * 100), current: completed, total: jobs.length, mode: 'text-to-video' });
      return { ok: true, index, media: { id, file: result.blob, blob: result.blob, url, sourceUrl: url, mimeType: result.blob.type || 'video/mp4', type: result.blob.type || 'video/mp4', sourceType: 'generated', generated: true, provider: 'Runway Gen-4.5', generationPrompt } };
    } catch (error) {
      completed += 1;
      onProgress?.({ stage: 'ai-video', value: Math.round((completed / Math.max(1, jobs.length)) * 100), current: completed, total: jobs.length, mode: 'text-to-video', failed: true });
      return { ok: false, index, error };
    }
  });
  const mediaItems = results.filter((result) => result?.ok).sort((a, b) => a.index - b.index).map((result) => result.media);
  return { mediaItems, generatedCount: mediaItems.length, attemptedCount: jobs.length, failedCount: jobs.length - mediaItems.length, provider: mediaItems.length ? 'Runway Gen-4.5' : 'none' };
}
