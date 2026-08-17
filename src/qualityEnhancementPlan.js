/* BIKEZTAGRAM AI — enhancement plan inspired by pro restoration tools. */

export const ENHANCEMENT_PRESETS = Object.freeze({
  clean: { denoise: 0.18, sharpen: 0.22, stabilize: 0.12, deblur: 0.08, upscale: 1 },
  action: { denoise: 0.12, sharpen: 0.28, stabilize: 0.28, deblur: 0.22, upscale: 1 },
  lowlight: { denoise: 0.48, sharpen: 0.14, stabilize: 0.18, deblur: 0.16, upscale: 1 },
  archival: { denoise: 0.62, sharpen: 0.18, stabilize: 0.34, deblur: 0.28, upscale: 2 },
  premium: { denoise: 0.24, sharpen: 0.3, stabilize: 0.2, deblur: 0.14, upscale: 2 },
});

export function chooseEnhancementPreset({ subjectType = 'general', environment = '', quality = 'auto' } = {}) {
  const text = `${subjectType} ${environment}`.toLowerCase();
  if (quality === 'restore') return 'archival';
  if (text.includes('night') || text.includes('lowlight')) return 'lowlight';
  if (text.includes('action') || text.includes('sport') || text.includes('vehicle')) return 'action';
  if (quality === 'premium') return 'premium';
  return 'clean';
}

export function buildEnhancementPlan({ preset = 'clean', target = 'source', frameRate = null } = {}) {
  const base = ENHANCEMENT_PRESETS[preset] || ENHANCEMENT_PRESETS.clean;
  return { version: 1, preset, target, ...base, frameRate: frameRate ? Number(frameRate) : null, previewFirst: true };
}
