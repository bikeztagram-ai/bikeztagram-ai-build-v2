/* Universal creative runtime — turns eligible still-image cuts into real generated video. */
import { generateAIVideoScene } from './aiVideoProvider.js';
const DEFAULT_MAX_GENERATED_INSERTS = 6;
const MAX_DATA_URI_BYTES = 3200000;
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
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const resized = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!resized || resized.size > MAX_DATA_URI_BYTES) return '';
    return blobToDataUri(resized);
  } catch { return ''; }
}
function cinematicPrompt({ creativePrompt, cut }) {
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
    'Preserve subject identity, spatial continuity and the important visual details from the reference image.',
    'Natural realistic motion, believable physics, coherent temporal movement and premium commercial cinematography.',
    'Do not replace the main subject, invent unrelated objects, add text, logos or watermarks, or create surreal deformation unless explicitly requested by the creative brief.'
  ].join(' ');
}
function ratioForPreset(preset = 'portrait') {
  if (preset === 'square') return '720:720';
  if (preset === 'landscape') return '1280:720';
  if (preset === 'cinema') return '1280:544';
  return '720:1280';
}
export async function enhanceStillCutsWithAIVideo({ mediaItems = [], plan, creativePrompt = '', outputPreset = 'portrait', maxGeneratedInserts = DEFAULT_MAX_GENERATED_INSERTS, onProgress } = {}) {
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
  let generatedCount = 0;
  let failedCount = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    onProgress?.({ stage: 'ai-video', value: Math.round(i / candidates.length * 100), current: i + 1, total: candidates.length });
    const promptImage = await prepareImageForRunway(candidate.source.file || candidate.source.blob);
    if (!promptImage) { failedCount += 1; continue; }
    try {
      const generationPrompt = cinematicPrompt({ creativePrompt, cut: candidate.cut });
      const duration = Math.max(2, Math.min(10, Number(candidate.cut?.duration) || 5));
      const result = await generateAIVideoScene({
        prompt: generationPrompt,
        duration,
        ratio: ratioForPreset(outputPreset),
        promptImage,
        onProgress: (value) => onProgress?.({ stage: 'ai-video', value: Math.round((i + value / 100) / candidates.length * 100), current: i + 1, total: candidates.length }),
      });
      if (!result?.blob) { failedCount += 1; continue; }
      const url = URL.createObjectURL(result.blob);
      const generatedId = `generated-video-${candidate.cutIndex}-${Date.now()}-${i}`;
      const generatedMedia = {
        ...candidate.source,
        id: generatedId,
        file: result.blob,
        blob: result.blob,
        url,
        sourceUrl: url,
        mimeType: result.blob.type || 'video/mp4',
        type: result.blob.type || 'video/mp4',
        sourceType: 'generated',
        generated: true,
        generatedFrom: candidate.source.id || `source-${candidate.mediaIndex}`,
        provider: 'Runway Gen-4.5',
        generationPrompt,
      };
      next.push(generatedMedia);
      candidate.cut.mediaId = generatedId;
      candidate.cut.generatedMediaId = generatedId;
      candidate.cut.generated = true;
      generatedCount += 1;
    } catch (error) {
      failedCount += 1;
      if (/not configured/i.test(error?.message || '')) break;
      console.warn('[AI VIDEO] Generation failed; retaining original source.', error);
    }
  }
  onProgress?.({ stage: 'ai-video', value: 100, current: candidates.length, total: candidates.length, generatedCount, failedCount });
  return { mediaItems: next, generatedCount, attemptedCount: candidates.length, failedCount, provider: generatedCount ? 'Runway Gen-4.5' : 'none' };
}
