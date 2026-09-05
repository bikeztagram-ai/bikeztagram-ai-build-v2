/* Universal creative runtime — generation policy and safe provider selection. */

const text = (value) => String(value ?? '').trim();

export function chooseVisualStrategy({ prompt = '', hasUploadedMedia = false, canGenerateVideo = false } = {}) {
  const brief = text(prompt).toLowerCase();
  const asksForGeneration = /create|generate|invent|imag(in)?e|make|show me|scene|world|character|creature|environment/.test(brief);
  if (canGenerateVideo && asksForGeneration) return { mode: 'ai-video', reason: 'creative brief requests generated motion' };
  if (hasUploadedMedia) return { mode: 'edit-source', reason: 'existing media provides the strongest subject identity' };
  return { mode: 'procedural', reason: 'no generated provider or source media is available' };
}

export function generationContract(asset = {}) {
  if (asset.sourceType !== 'generated') return { valid: true, reason: 'source media' };
  const playable = Boolean(asset.file || asset.blob || asset.sourceUrl || asset.url);
  return playable
    ? { valid: true, reason: 'generated asset has a playable source' }
    : { valid: false, reason: 'generated asset has no playable source' };
}

export function shouldRejectFakeGeneration(asset = {}) {
  return asset.sourceType === 'generated' && !generationContract(asset).valid;
}
