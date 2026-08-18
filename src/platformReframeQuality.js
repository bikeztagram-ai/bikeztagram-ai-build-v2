/* BIKEZTAGRAM AI — platform reframe quality gate.
   Product contract only. It never changes source footage, Gemini, Blob, Vercel,
   or the existing renderer. */

const PLATFORMS = new Set(['reels', 'tiktok', 'shorts', 'youtube', 'square']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function validatePlatformReframePlan(plan = {}, analysis = {}) {
  const errors = [];
  const warnings = [];
  if (plan?.sourceOfTruth !== 'same-verified-edit') errors.push('Reframe must reference the same verified edit.');
  if (plan?.preserveTimeline !== true) errors.push('Reframe must preserve the editorial timeline.');
  if (plan?.preserveSourceTimestamps !== true) errors.push('Reframe must preserve source timestamps.');
  if (!Array.isArray(plan?.platforms) || !plan.platforms.length) errors.push('No platform framing profiles supplied.');

  for (const item of plan?.platforms || []) {
    if (!PLATFORMS.has(item.platform)) errors.push(`Unsupported platform profile: ${item.platform || 'unknown'}.`);
    if (!item.output?.width || !item.output?.height) errors.push(`${item.platform}: missing output dimensions.`);
    if (!item.crop || item.crop.width <= 0 || item.crop.height <= 0) errors.push(`${item.platform}: invalid crop.`);
    if (item.crop && (item.crop.x < 0 || item.crop.y < 0 || item.crop.x + item.crop.width > 1.001 || item.crop.y + item.crop.height > 1.001)) errors.push(`${item.platform}: crop leaves source bounds.`);
    if (item.safeArea && (clamp(num(item.safeArea.width, 0), 0, 1) !== item.safeArea.width || clamp(num(item.safeArea.height, 0), 0, 1) !== item.safeArea.height)) errors.push(`${item.platform}: invalid safe area.`);
    if (item.crop?.focalPoint && (item.crop.focalPoint.x < 0 || item.crop.focalPoint.x > 1 || item.crop.focalPoint.y < 0 || item.crop.focalPoint.y > 1)) errors.push(`${item.platform}: focal point outside source bounds.`);
    if (item.rendererReady === true) warnings.push(`${item.platform}: renderer execution is marked ready; verify this only after a real platform render.`);
  }

  const subjectFocal = analysis?.subject?.focalPoint || analysis?.subject?.composition?.focalPoint;
  if (!subjectFocal) warnings.push('Stage 1 supplied no explicit focal point; platform crops use a conservative centre fallback.');

  return { valid: errors.length === 0, errors, warnings, platformCount: Array.isArray(plan?.platforms) ? plan.platforms.length : 0 };
}

export function buildReframeReadiness(plan, analysis) {
  const validation = validatePlatformReframePlan(plan, analysis);
  return {
    ...validation,
    readyForPlanning: validation.valid,
    readyForRendering: false,
    reason: validation.valid ? 'Platform framing is planned but renderer execution remains intentionally gated.' : 'Fix platform framing contract errors before renderer work.'
  };
}
