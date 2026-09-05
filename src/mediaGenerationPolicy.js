/* Universal media-generation policy: generated assets must always resolve to real playable media. */
const text = (value) => String(value ?? '').trim().toLowerCase();
export function chooseVisualStrategy({ prompt = '', hasUploadedMedia = false, canGenerateVideo = false } = {}) {
  const brief = text(prompt);
  const asksForGeneration = /create|generate|invent|imagine|make|show me|scene|world|character|creature|environment/.test(brief);
  if (canGenerateVideo && asksForGeneration) return { mode: 'ai-video', reason: 'Creative brief requests generated visual content and a video provider is available.' };
  if (hasUploadedMedia) return { mode: 'edit-source', reason: 'Use supplied media as the visual source.' };
  return { mode: 'procedural', reason: 'No generation provider or uploaded media is available.' };
}
export function generationContract(asset = {}) {
  if (asset.sourceType !== 'generated') return { valid: true, playable: Boolean(asset.file || asset.blob || asset.sourceUrl || asset.url), reason: 'source-media' };
  const playable = Boolean(asset.file || asset.blob || asset.sourceUrl || asset.url);
  return playable ? { valid: true, playable: true, reason: 'generated-real-media' } : { valid: false, playable: false, reason: 'Generated asset has no playable file, blob or source URL.' };
}
export function shouldRejectFakeGeneration(asset = {}) { return asset.sourceType === 'generated' && !generationContract(asset).valid; }
