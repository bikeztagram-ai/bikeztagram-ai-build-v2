/* BIKEZTAGRAM AI — turns selected still-image cuts into real generated video when Runway is configured. */
import { generateAIVideoScene } from './aiVideoProvider.js';

const MAX_GENERATED_INSERTS = 3;
const MAX_DATA_URI_BYTES = 3_200_000;

const blobToDataUri = blob => new Promise((resolve, reject) => {
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
    const resized = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!resized || resized.size > MAX_DATA_URI_BYTES) return '';
    return blobToDataUri(resized);
  } catch {
    return '';
  }
}

function cinematicPrompt({ creativePrompt, cut }) {
  const role = cut?.purpose || 'cinematic shot';
  const motion = cut?.motionStyle || 'subtle natural camera movement';
  return [
    creativePrompt || 'Create a premium cinematic motorcycle social film.',
    `Generate a real moving video shot for the ${role}.`,
    `Camera: ${motion}.`,
    'Preserve the motorcycle, rider, environment and identity from the reference image.',
    'Natural realistic motion, believable physics, cinematic lighting, premium commercial cinematography.',
    'Do not invent a different motorcycle or replace the main subject.',
    'No text, logos, watermarks or surreal deformation.'
  ].join(' ');
}

export async function enhanceStillCutsWithAIVideo({ mediaItems = [], plan, creativePrompt = '', onProgress } = {}) {
  if (!Array.isArray(mediaItems) || !plan?.cuts?.length) return { mediaItems, generatedCount: 0, provider: 'none' };
  const next = mediaItems.map(item => ({ ...item }));
  const candidates = [];
  const seen = new Set();
  for (let i = 0; i < plan.cuts.length; i += 1) {
    const cut = plan.cuts[i];
    const index = Number(cut?.mediaIndex);
    const source = Number.isInteger(index) ? next[index] : null;
    if (!source || seen.has(index)) continue;
    const file = source.file || source.blob;
    if (!(file instanceof Blob) || !String(file.type || '').startsWith('image/')) continue;
    seen.add(index);
    candidates.push({ cutIndex: i, mediaIndex: index, source, cut });
    if (candidates.length >= MAX_GENERATED_INSERTS) break;
  }
  if (!candidates.length) return { mediaItems: next, generatedCount: 0, provider: 'none' };

  let generatedCount = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    onProgress?.({ stage: 'ai-video', value: Math.round((i / candidates.length) * 100), current: i + 1, total: candidates.length });
    const promptImage = await prepareImageForRunway(candidate.source.file || candidate.source.blob);
    if (!promptImage) continue;
    try {
      const result = await generateAIVideoScene({
        prompt: cinematicPrompt({ creativePrompt, cut: candidate.cut }),
        duration: Math.max(4, Math.min(5, Number(candidate.cut?.duration) || 5)),
        ratio: '720:1280',
        promptImage,
        onProgress: value => onProgress?.({ stage: 'ai-video', value: Math.round(((i + value / 100) / candidates.length) * 100), current: i + 1, total: candidates.length })
      });
      if (!result?.url) continue;
      const response = await fetch(result.url);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!blob.size) continue;
      const url = URL.createObjectURL(blob);
      next[candidate.mediaIndex] = {
        ...candidate.source,
        file: blob,
        blob,
        url,
        sourceUrl: url,
        mimeType: blob.type || 'video/mp4',
        type: blob.type || 'video/mp4',
        sourceType: 'generated',
        generated: true,
        generatedFrom: candidate.source.id || `source-${candidate.mediaIndex}`,
        provider: 'Runway Gen-4.5',
        generationPrompt: cinematicPrompt({ creativePrompt, cut: candidate.cut })
      };
      generatedCount += 1;
    } catch (error) {
      if (/not configured/i.test(error?.message || '')) break;
      console.warn('[AI VIDEO] Still enhancement failed; keeping original source.', error);
    }
  }
  onProgress?.({ stage: 'ai-video', value: 100, current: candidates.length, total: candidates.length, generatedCount });
  return { mediaItems: next, generatedCount, provider: generatedCount ? 'Runway Gen-4.5' : 'none' };
}
