const MOODS = new Set(['CINEMATIC','DARK','EPIC','ENERGETIC','MYSTERIOUS','PLAYFUL','EMOTIONAL','DOCUMENTARY','ORIGINAL']);
const OUTPUTS = new Set(['SOCIAL_REEL','SHORT_FILM','TRAILER','MUSIC_VIDEO','STORY_SCENE','CUSTOM']);

function clean(value, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : fallback;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Convert a natural-language creative request and media references into a
 * deterministic, provider-neutral production brief. This is deliberately a
 * compiler layer: generation models should receive the compiled intent rather
 * than raw user text alone.
 */
export function compileCreativeBrief(input = {}) {
  const request = clean(input.request, 'Create an original cinematic video.');
  const output = OUTPUTS.has(input.output) ? input.output : 'CUSTOM';
  const mood = MOODS.has(input.mood) ? input.mood : 'ORIGINAL';
  const references = Array.isArray(input.references) ? input.references : [];

  const referenceRoles = references.map((ref, index) => ({
    id: clean(ref?.id, `ref-${index + 1}`),
    role: clean(ref?.role, 'UNSPECIFIED').toUpperCase(),
    description: clean(ref?.description),
    preserve: Array.isArray(ref?.preserve) ? unique(ref.preserve.map(clean)).slice(0, 12) : [],
  }));

  return {
    schema: 'bikeztagram.creative-brief.v1',
    request,
    output,
    mood,
    durationSeconds: Number.isFinite(input.durationSeconds)
      ? Math.min(600, Math.max(3, Math.round(input.durationSeconds)))
      : 15,
    aspectRatio: clean(input.aspectRatio, '9:16'),
    references: referenceRoles,
    creativeConstraints: unique([
      'Prefer original expression over direct imitation of protected works.',
      ...(Array.isArray(input.constraints) ? input.constraints.map(clean) : []),
    ]).slice(0, 20),
    continuity: {
      preserveReferenceIdentity: referenceRoles.some((ref) => ref.preserve.includes('IDENTITY')),
      preserveObjectDetails: referenceRoles.some((ref) => ref.preserve.includes('OBJECT_DETAILS')),
      preserveEnvironment: referenceRoles.some((ref) => ref.preserve.includes('ENVIRONMENT')),
    },
  };
}

export function briefToProviderPrompt(brief) {
  if (!brief || brief.schema !== 'bikeztagram.creative-brief.v1') {
    throw new TypeError('A creative-brief.v1 object is required');
  }

  const refs = brief.references.length
    ? brief.references.map((ref) => `- ${ref.id}: ${ref.role}${ref.description ? ` — ${ref.description}` : ''}`).join('\n')
    : '- No external references supplied.';

  return [
    `Create an original ${brief.output.toLowerCase()} production.`,
    `Creative request: ${brief.request}`,
    `Mood: ${brief.mood}`,
    `Duration: ${brief.durationSeconds}s`,
    `Aspect ratio: ${brief.aspectRatio}`,
    'References and their intended roles:',
    refs,
    'Creative constraints:',
    ...brief.creativeConstraints.map((constraint) => `- ${constraint}`),
    'Prioritise continuity and the explicit role of each reference.',
  ].join('\n');
}
