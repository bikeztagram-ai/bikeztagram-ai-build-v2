/* BIKEZTAGRAM AI — provider-neutral generative scene contract.
 *
 * This module defines what the director is allowed to request from a future
 * image/video generation provider without making that provider a core
 * dependency. It intentionally produces prompts/specifications only.
 */

const ALLOWED_SUBJECTS = new Set(['person', 'woman', 'man', 'motorcycle', 'vehicle', 'environment', 'object']);
const AGE_RE = /\b(?:adult|18\s*\+|(?:2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\s*(?:year|years)\s*old)\b/i;

function text(value) { return String(value ?? '').trim(); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export function buildGenerationRequest(input = {}) {
  const subject = text(input.subject || 'person').toLowerCase();
  if (!ALLOWED_SUBJECTS.has(subject)) throw new Error(`Unsupported generation subject: ${subject}`);

  const description = text(input.description);
  if (!description) throw new Error('A generation description is required.');

  const adultConfirmed = input.adultConfirmed === true || AGE_RE.test(description);
  if (subject === 'woman' || subject === 'man' || subject === 'person') {
    if (!adultConfirmed) throw new Error('Generated human subjects must be explicitly adult.');
  }

  const style = text(input.style || 'cinematic realistic photography');
  const environment = text(input.environment || 'cinematic motorcycle setting');
  const wardrobe = text(input.wardrobe);
  const composition = text(input.composition || 'vertical social-media composition');
  const lighting = text(input.lighting || 'moody cinematic lighting');
  const continuityId = text(input.continuityId);
  const durationSeconds = clamp(Number(input.durationSeconds) || 3, 1, 8);

  const promptParts = [
    'Create an original fictional scene.',
    description,
    style,
    environment,
    wardrobe ? `Wardrobe: ${wardrobe}.` : '',
    composition,
    lighting,
    continuityId ? `Maintain visual continuity with character/reference ID ${continuityId}.` : '',
    'Do not depict a real identifiable person. Do not copy a copyrighted character or trademarked fictional character design.',
  ].filter(Boolean);

  return {
    version: 'generation-request-v1',
    providerNeutral: true,
    subject,
    adultConfirmed,
    prompt: promptParts.join(' '),
    durationSeconds,
    aspectRatio: text(input.aspectRatio || '9:16'),
    continuityId: continuityId || null,
    originalOnly: true,
    requiresExternalProvider: true,
    readyForProvider: true,
  };
}

export function buildCharacterRequest(input = {}) {
  const request = buildGenerationRequest({
    ...input,
    subject: text(input.subject || 'woman').toLowerCase(),
    adultConfirmed: input.adultConfirmed === true,
  });

  return {
    ...request,
    character: {
      name: text(input.name) || null,
      description: request.prompt,
      continuityId: request.continuityId,
      consistencyGoal: 'Preserve identity-defining visual traits across future original scenes.',
    },
  };
}
