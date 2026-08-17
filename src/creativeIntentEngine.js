/* BIKEZTAGRAM AI — general creative intent, not bike-specific. */

const MOODS = ['cinematic','energetic','luxury','playful','dramatic','calm','gritty','romantic','inspiring','professional'];
const PLATFORMS = ['reels','shorts','tiktok','youtube','story','feed','web','cinema'];

export function createCreativeIntent(input = {}) {
  const subject = normaliseSubject(input.subject);
  const mood = MOODS.includes(input.mood) ? input.mood : 'cinematic';
  const platform = PLATFORMS.includes(input.platform) ? input.platform : 'reels';
  const duration = Math.max(3, Math.min(600, Number(input.duration) || 30));
  return { version: 1, subject, mood, platform, duration, story: String(input.story || '').trim(), audience: String(input.audience || '').trim(), references: Array.isArray(input.references) ? input.references : [], constraints: Array.isArray(input.constraints) ? input.constraints : [] };
}

export function normaliseSubject(subject = {}) {
  if (typeof subject === 'string') return { type: 'general', label: subject.trim() || 'subject' };
  return { type: String(subject.type || 'general').trim().toLowerCase(), label: String(subject.label || subject.name || 'subject').trim() };
}

export function validateCreativeIntent(intent) {
  const errors = [];
  if (!intent?.subject?.label) errors.push('A subject is required.');
  if (!MOODS.includes(intent?.mood)) errors.push('Unsupported mood.');
  if (!PLATFORMS.includes(intent?.platform)) errors.push('Unsupported platform.');
  if (!Number.isFinite(intent?.duration) || intent.duration < 3) errors.push('Duration must be at least 3 seconds.');
  return { valid: errors.length === 0, errors };
}
