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

const NORMALISE_PROMPT = (value) => String(value || '')
  .toLowerCase()
  .replace(/[×x]/g, ':')
  .replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Resolve the requested delivery shape from an explicit preset or natural
 * language creative brief. The renderer owns the actual transcode; this
 * helper only turns creator intent into one of the supported contracts.
 */
export function resolveOutputPreset(value = 'portrait', creativePrompt = '') {
  const explicit = String(value || '').toLowerCase().trim();
  if (OUTPUT_PRESETS[explicit]) return OUTPUT_PRESETS[explicit];

  const prompt = NORMALISE_PROMPT(creativePrompt);

  // Social/mobile language should win over the generic default. These aliases
  // are intentionally broad because creators commonly say "vertical reel"
  // rather than explicitly typing 9:16.
  if (/\b(9:?16|vertical|portrait|reel|reels|tiktok|shorts|youtube shorts|instagram reels|stories|story)\b/.test(prompt)) {
    return OUTPUT_PRESETS.portrait;
  }
  if (/\b(1:?1|square|feed post|instagram feed|social square)\b/.test(prompt)) {
    return OUTPUT_PRESETS.square;
  }
  if (/\b(16:?9|landscape|horizontal|widescreen|youtube|desktop video|cinema|cinematic widescreen)\b/.test(prompt)) {
    return OUTPUT_PRESETS.landscape;
  }

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
