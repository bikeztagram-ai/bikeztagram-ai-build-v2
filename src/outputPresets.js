/* BIKEZTAGRAM AI — universal output format contract. */

export const OUTPUT_PRESETS = Object.freeze({
  portrait: Object.freeze({
    id: 'portrait', label: '9:16 Social', width: 1080, height: 1920,
    aspectRatio: '9:16', platforms: ['Instagram Reels', 'TikTok', 'YouTube Shorts']
  }),
  square: Object.freeze({
    id: 'square', label: '1:1 Square', width: 1080, height: 1080,
    aspectRatio: '1:1', platforms: ['Instagram Feed', 'social square']
  }),
  landscape: Object.freeze({
    id: 'landscape', label: '16:9 Landscape', width: 1920, height: 1080,
    aspectRatio: '16:9', platforms: ['YouTube', 'desktop video', 'landscape social']
  })
});

export function resolveOutputPreset(value = 'portrait', creativePrompt = '') {
  const explicit = String(value || '').toLowerCase();
  if (OUTPUT_PRESETS[explicit]) return OUTPUT_PRESETS[explicit];
  const prompt = String(creativePrompt || '').toLowerCase();
  if (/\b(16:?9|landscape|horizontal|widescreen|youtube)\b/.test(prompt)) return OUTPUT_PRESETS.landscape;
  if (/\b(1:?1|square|feed post)\b/.test(prompt)) return OUTPUT_PRESETS.square;
  return OUTPUT_PRESETS.portrait;
}

export function outputPlanFields(value, creativePrompt = '') {
  const preset = resolveOutputPreset(value, creativePrompt);
  return {
    outputPreset: preset.id,
    outputWidth: preset.width,
    outputHeight: preset.height,
    outputAspectRatio: preset.aspectRatio
  };
}
