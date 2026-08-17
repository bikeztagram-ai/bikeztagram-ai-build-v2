/* BIKEZTAGRAM AI — caption track planning. */

export const CAPTION_STYLES = Object.freeze({ cinematic: { position: 'lower-third', emphasis: 'word', size: 'large' }, minimal: { position: 'lower-third', emphasis: 'none', size: 'medium' }, punchy: { position: 'center', emphasis: 'phrase', size: 'large' } });

export function buildCaptionPlan(transcript = [], style = 'cinematic') {
  const preset = CAPTION_STYLES[style] || CAPTION_STYLES.cinematic;
  return { version: 1, style, preset, captions: (Array.isArray(transcript) ? transcript : []).map((item, index) => ({ id: item.id || `caption-${index + 1}`, text: String(item.text || '').trim(), start: Math.max(0, Number(item.start) || 0), end: Math.max(0, Number(item.end) || 0), emphasis: item.emphasis || null })).filter((item) => item.text && item.end > item.start) };
}

export function validateCaptionPlan(plan) {
  const errors = [];
  (plan?.captions || []).forEach((caption, index) => { if (caption.end <= caption.start) errors.push(`Caption ${index + 1} has invalid timing.`); });
  return { valid: errors.length === 0, errors };
}
