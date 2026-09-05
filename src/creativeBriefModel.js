/* Universal creative brief normalization: provider-neutral semantic vocabulary. */
const text = (value) => String(value ?? '').trim();
const pick = (source, terms, fallback) => terms.find((term) => source.includes(term)) || fallback;
const inferList = (source, terms) => terms.filter((term) => source.includes(term));

export function normalizeCreativeBrief(prompt = '', options = {}) {
  const raw = text(prompt);
  const source = raw.toLowerCase();
  return {
    subject: pick(source, ['motorcycle', 'car', 'truck', 'vehicle', 'robot', 'person', 'character', 'animal', 'creature', 'spaceship', 'building', 'city', 'landscape'], 'subject'),
    setting: pick(source, ['space', 'mars', 'desert', 'jungle', 'forest', 'ocean', 'underwater', 'city', 'street', 'mountain', 'castle', 'studio', 'warehouse'], 'environment'),
    mood: pick(source, ['horror', 'dark', 'romantic', 'dreamy', 'epic', 'funny', 'calm', 'aggressive', 'mysterious', 'nostalgic', 'futuristic'], 'cinematic'),
    camera: pick(source, ['fpv', 'drone', 'aerial', 'orbit', 'tracking', 'close-up', 'wide shot', 'macro', 'handheld', 'static'], 'cinematic'),
    lighting: pick(source, ['neon', 'moonlight', 'sunset', 'sunrise', 'golden hour', 'studio', 'volumetric', 'backlit'], 'cinematic'),
    actions: inferList(source, ['chase', 'race', 'drift', 'fight', 'fly', 'explode', 'walk', 'run', 'transform', 'reveal', 'discover', 'crash', 'dance', 'build', 'destroy', 'escape']),
    style: pick(source, ['anime', 'western', 'cyberpunk', 'sci-fi', 'fantasy', 'documentary', 'commercial', 'music video', 'trailer', 'noir', 'photorealistic', 'surreal'], 'cinematic'),
    pace: pick(source, ['fast', 'slow', 'calm', 'rapid', 'energetic'], 'cinematic'),
    aspectRatio: options.aspectRatio || pick(source, ['9:16', '16:9', '1:1', '2.39:1'], 'portrait'),
    raw,
  };
}

export function briefToGenerationDirectives(brief = {}) {
  return {
    subject: brief.subject || 'subject',
    environment: brief.setting || 'environment',
    mood: brief.mood || 'cinematic',
    camera: brief.camera || 'cinematic',
    lighting: brief.lighting || 'cinematic',
    actions: Array.isArray(brief.actions) ? brief.actions : [],
    style: brief.style || 'cinematic',
    pace: brief.pace || 'cinematic',
    aspectRatio: brief.aspectRatio || 'portrait',
  };
}
