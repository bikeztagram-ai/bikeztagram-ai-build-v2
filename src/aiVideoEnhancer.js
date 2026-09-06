/* Universal creative video generation: real Runway video for prompt-only scenes and reference-image animation. */
import { generateAIVideoScene } from './aiVideoProvider.js';

const DEFAULT_MAX_GENERATED_INSERTS = 6;
const MAX_DATA_URI_BYTES = 3200000;
const DEFAULT_CONCURRENCY = 2;

const blobToDataUri = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Could not read image for AI video generation.'));
  reader.readAsDataURL(blob);
});

async function prepareImageForRunway(file) {
  if (!(file instanceof Blob)) return '';
  if (file.size <= MAX_DATA_URI_BYTES) return blobToDataUri(file);
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return '';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const resized = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!resized || resized.size > MAX_DATA_URI_BYTES) return '';
    return blobToDataUri(resized);
  } catch { return ''; }
}

function cinematicPrompt({ creativePrompt, cut, reference = true }) {
  const intent = cut?.creativeIntent || {};
  const subject = intent.subject || cut?.subject || 'the main subject';
  const world = intent.world || cut?.world || 'the requested environment';
  const role = cut?.purpose || intent.role || 'cinematic shot';
  const action = Array.isArray(cut?.action) ? cut.action.join(', ') : String(cut?.action || 'natural purposeful movement');
  const motion = cut?.motionStyle || intent.camera?.movement || 'subtle natural camera movement';
  const lighting = Array.isArray(intent.lighting) ? intent.lighting.join(', ') : String(intent.lighting || 'cinematic lighting');
  const style = intent.directives?.style || intent.style || 'cinematic';
  return [
    creativePrompt || 'Create a premium cinematic audiovisual scene.',
    `Generate a real moving video shot for the ${role}.`,
    `Subject: ${subject}. Environment: ${world}. Action: ${action}.`,
    `Camera: ${motion}. Lighting: ${lighting}. Visual language: ${style}.`,
    reference ? 'Preserve subject identity, spatial continuity and important visual details from the reference image.' : 'Invent the complete scene faithfully from the creative brief while maintaining strong visual continuity.',
    'Natural purposeful motion, believable physics, coherent temporal movement and premium commercial cinematography.',
    'Do not add unrelated objects, text, logos or watermarks, or create surreal deformation unless explicitly requested by the creative brief.'
  ].join(' ');
}

function ratioForPreset(preset = 'portrait') {
  if (preset === 'square') return '960:960';
  if (preset === 'landscape' || preset === 'cinema') return '1280:720';
  return '720:1280';
}

function generatedMedia(result, id, generationPrompt, provider = 'Runway Gen-4.5') {
  const url = URL.createObjectURL(result.blob);
  return { id, file: result.blob, blob: result.blob, url, sourceUrl: url, mimeType: result.blob.type || 'video/mp4', type: result.blob.type || 'video/mp4', sourceType: 'generated', generated: true, provider, generationPrompt };
}

async function mapBounded(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length || 1) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function generatePromptOnlyVideoCuts({ plan, creativePrompt = '', outputPreset = 'portrait', maxGeneratedCuts = 6, concurrency = DEFAULT_CONCURRENCY, onProgress } = {}) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  const count = Math.min(cuts.length, Math.max(1, Number(maxGeneratedCuts) || 6));
  if (!count) return { mediaItems: [], generatedCount: 0, attemptedCount: 0, failedCount: 0, provider: 'none' };
  let completed = 0;
  const results = await mapBounded(cuts.slice(0, count), concurrency, async (cut, i) => {
    const generationPrompt = cinematicPrompt({ creativePrompt, cut, reference: false });
    const duration = Math.max(2, Math.min(10, Number(cut?.duration) || 5));
    onProgress?.({ stage: 'ai-video', value: Math.round(completed / count * 100), current: completed + 1, total: count, mode: 'text-to-video', concurrency });
    try {
      const result = await generateAIVideoScene({ prompt: generationPrompt, duration, ratio: ratioForPreset(outputPreset), onProgress: (value) => onProgress?.({ stage: 'ai-video', value: Math.round((completed + value / 100) / count * 100), current: i + 1, total: count, mode: 'text-to-video', concurrency }) });
      if (!result?.blob) return { ok: false };
      const id = `generated-text-video-${i}-${Date.now()}`;
      return { ok: true, media: generatedMedia(result, id, generationPrompt), id };
    } catch (error) {
      if (/not configured/i.test(error?.message || '')) return { ok: false, fatal: true, error };
      console.warn('[AI VIDEO] Text-to-video generation failed.', error);
      return { ok: false, error };
    } finally {
      completed += 1;
      onProgress?.({ stage: 'ai-video', value: Math.round(completed / count * 100), current: completed, total: count, mode: 'text-to-video', concurrency });
    }
  });
  const mediaItems = [];
  let failedCount = 0;
  let fatal = false;
  results.forEach((result, index) => {
    if (result?.ok) {
      result.media.mediaIndex = mediaItems.length;
      mediaItems.push(result.media);
      const cut = cuts[index];
      cut.mediaId = result.id; cut.generatedMediaId = result.id; cut.generated = true; cut.mediaIndex = mediaItems.length - 1;
    } else { failedCount += 1; if (result?.fatal) fatal = true; }
  });
  onProgress?.({ stage: 'ai-video', value: 100, current: count, total: count, generatedCount: mediaItems.length, failedCount, fatal, mode: 'text-to-video', concurrency });
  return { mediaItems, generatedCount: mediaItems.length, attemptedCount: count, failedCount, provider: mediaItems.length ? 'Runway Gen-4.5' : 'none', concurrency };
}

export async function enhanceStillCutsWithAIVideo({ mediaItems = [], plan, creativePrompt = '', outputPreset = 'portrait', maxGeneratedInserts = DEFAULT_MAX_GENERATED_INSERTS, concurrency = DEFAULT_CONCURRENCY, onProgress } = {}) {
  if (!Array.isArray(mediaItems) || !plan?.cuts?.length) return { mediaItems, generatedCount: 0, attemptedCount: 0, failedCount: 0, provider: 'none' };
  const next = mediaItems.map((item) => ({ ...item }));
  const candidates = [];
  for (let i = 0; i < plan.cuts.length; i += 1) {
    const cut = plan.cuts[i];
    const index = Number(cut?.mediaIndex);
    const source = Number.isInteger(index) ? next[index] : null;
    const file = source?.file || source?.blob;
    if (!source || !(file instanceof Blob) || !String(file.type || '').startsWith('image/')) continue;
    candidates.push({ cutIndex: i, mediaIndex: index, source, cut });
    if (candidates.length >= Math.max(0, Number(maxGeneratedInserts) || DEFAULT_MAX_GENERATED_INSERTS)) break;
  }
  if (!candidates.length) return { mediaItems: next, generatedCount: 0, attemptedCount: 0, failedCount: 0, provider: 'none' };
  let completed = 0;
  const results = await mapBounded(candidates, concurrency, async (candidate, i) => {
    onProgress?.({ stage: 'ai-video', value: Math.round(completed / candidates.length * 100), current: i + 1, total: candidates.length, concurrency });
    const promptImage = await prepareImageForRunway(candidate.source.file || candidate.source.blob);
    if (!promptImage) return { ok: false };
    try {
      const generationPrompt = cinematicPrompt({ creativePrompt, cut: candidate.cut, reference: true });
      const duration = Math.max(2, Math.min(10, Number(candidate.cut?.duration) || 5));
      const result = await generateAIVideoScene({ prompt: generationPrompt, duration, ratio: ratioForPreset(outputPreset), promptImage, onProgress: (value) => onProgress?.({ stage: 'ai-video', value: Math.round((completed + value / 100) / candidates.length * 100), current: i + 1, total: candidates.length, concurrency }) });
      if (!result?.blob) return { ok: false };
      const generatedId = `generated-video-${candidate.cutIndex}-${Date.now()}-${i}`;
      return { ok: true, generated: generatedMedia(result, generatedId, generationPrompt), candidate };
    } catch (error) {
      if (/not configured/i.test(error?.message || '')) return { ok: false, fatal: true, error };
      console.warn('[AI VIDEO] Generation failed; retaining original source.', error);
      return { ok: false, error };
    } finally {
      completed += 1;
      onProgress?.({ stage: 'ai-video', value: Math.round(completed / candidates.length * 100), current: completed, total: candidates.length, concurrency });
    }
  });
  let generatedCount = 0; let failedCount = 0; let fatal = false;
  results.forEach((result) => {
    if (!result?.ok) { failedCount += 1; if (result?.fatal) fatal = true; return; }
    const candidate = result.candidate;
    const generated = result.generated;
    next.push({ ...candidate.source, ...generated, generatedFrom: candidate.source.id || `source-${candidate.mediaIndex}` });
    candidate.cut.mediaId = generated.id; candidate.cut.generatedMediaId = generated.id; candidate.cut.generated = true;
    generatedCount += 1;
  });
  onProgress?.({ stage: 'ai-video', value: 100, current: candidates.length, total: candidates.length, generatedCount, failedCount, fatal, concurrency });
  return { mediaItems: next, generatedCount, attemptedCount: candidates.length, failedCount, provider: generatedCount ? 'Runway Gen-4.5' : 'none', concurrency };
}
