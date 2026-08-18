/* BIKEZTAGRAM AI — generated-media contract.
   Provider-neutral planning only. No generation API, Gemini endpoint, Blob config,
   or credentials are changed here. Generated assets use the same master timeline
   as uploaded footage so future image/video generation can be added without a
   second editor architecture. */

const TYPES = new Set(['image', 'video']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createGeneratedScene({
  id,
  type = 'image',
  prompt = '',
  duration = 2,
  purpose = 'generated-cinematic-beat',
  style = 'cinematic',
  aspect = '9:16',
  continuityNotes = '',
  referenceIds = [],
} = {}) {
  const safeType = TYPES.has(type) ? type : 'image';
  return {
    id: String(id || `generated-${Date.now()}`),
    sourceType: 'generated',
    generated: true,
    generatedMediaType: safeType,
    generationPrompt: String(prompt || '').trim(),
    duration: clamp(Number(duration) || 2, 0.5, 8),
    purpose: String(purpose || 'generated-cinematic-beat'),
    style: String(style || 'cinematic'),
    aspect: String(aspect || '9:16'),
    continuityNotes: String(continuityNotes || ''),
    referenceIds: Array.isArray(referenceIds) ? referenceIds.slice(0, 8) : [],
    provider: null,
    assetUrl: null,
    generationStatus: 'planned',
  };
}

export function validateGeneratedScene(scene) {
  const issues = [];
  if (scene?.sourceType !== 'generated' || scene?.generated !== true) issues.push('Scene is not marked as generated.');
  if (!TYPES.has(scene?.generatedMediaType)) issues.push('Generated media type must be image or video.');
  if (!String(scene?.generationPrompt || '').trim()) issues.push('Generation prompt is required.');
  if (!Number.isFinite(Number(scene?.duration)) || Number(scene.duration) < 0.5 || Number(scene.duration) > 8) issues.push('Generated scene duration is invalid.');
  if (scene?.generationStatus === 'ready' && !scene?.assetUrl) issues.push('Ready generated scene has no asset reference.');
  return { ready: issues.length === 0, issues };
}

export function mergeGeneratedScenes(masterScenes = [], generatedScenes = []) {
  const generated = generatedScenes.map((scene) => createGeneratedScene(scene));
  return [...masterScenes, ...generated].map((scene, index) => ({
    ...scene,
    storyOrder: scene.storyOrder || index + 1,
  }));
}
