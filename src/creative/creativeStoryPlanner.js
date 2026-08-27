const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const text = (value) => String(value ?? '').toLowerCase();
const hasAny = (value, words) => words.some((word) => text(value).includes(word));
const unique = (values) => [...new Set(values.filter(Boolean))];

const ARC_TEMPLATES = {
  SOCIAL_REEL: [
    ['hook', 0.12, 'Establish the subject or strongest visual question immediately.'],
    ['build', 0.20, 'Create curiosity with detail, environment or controlled movement.'],
    ['reveal', 0.22, 'Deliver the clearest subject reveal or creative payoff.'],
    ['action', 0.28, 'Escalate energy with the strongest movement or visual progression.'],
    ['hero', 0.18, 'Finish on the most memorable, readable hero composition.'],
  ],
  TRAILER: [
    ['hook', 0.10, 'Open with a high-value image or unanswered visual question.'],
    ['build', 0.25, 'Layer context, details and rising anticipation.'],
    ['reveal', 0.20, 'Reveal the central subject, promise or transformation.'],
    ['action', 0.25, 'Escalate pace and visual intensity toward the peak.'],
    ['hero', 0.20, 'Resolve with a definitive hero image or title-safe ending.'],
  ],
  MUSIC_VIDEO: [
    ['hook', 0.10, 'Introduce the visual motif and musical identity.'],
    ['build', 0.25, 'Develop visual rhythm and motif variation.'],
    ['reveal', 0.20, 'Introduce the strongest visual idea or subject relationship.'],
    ['action', 0.30, 'Peak through movement, rhythmic variety and visual escalation.'],
    ['hero', 0.15, 'Close with a clean final visual beat.'],
  ],
  SHORT_FILM: [
    ['hook', 0.14, 'Establish place, subject and the central visual question.'],
    ['build', 0.26, 'Develop context and anticipation without exhausting the reveal.'],
    ['reveal', 0.20, 'Deliver the story or subject revelation.'],
    ['action', 0.24, 'Escalate the central visual or emotional movement.'],
    ['hero', 0.16, 'Resolve the story with a deliberate final image.'],
  ],
  STORY_SCENE: [
    ['hook', 0.16, 'Orient the viewer in the scene.'],
    ['build', 0.28, 'Establish relationships, environment or tension.'],
    ['reveal', 0.22, 'Deliver the scene's key discovery.'],
    ['action', 0.20, 'Show the consequence or movement of the discovery.'],
    ['hero', 0.14, 'Give the viewer a coherent visual resolution.'],
  ],
  CUSTOM: [
    ['hook', 0.12, 'Start with the strongest available visual proposition.'],
    ['build', 0.23, 'Increase information, variety or anticipation.'],
    ['reveal', 0.22, 'Deliver the primary creative payoff.'],
    ['action', 0.27, 'Escalate visual energy where the material supports it.'],
    ['hero', 0.16, 'End with a strong, readable final composition.'],
  ],
};

function normaliseMedia(media = [], primarySubject = 'unknown') {
  return (Array.isArray(media) ? media : []).map((item, index) => ({
    id: String(item?.id ?? item?.mediaId ?? `media-${index + 1}`),
    index,
    score: clamp(Number(item?.score) || 0, 0, 100),
    subjectType: String(item?.subjectType || item?.subjectCategory || primarySubject || 'unknown'),
    type: String(item?.type || 'unknown'),
    duration: Math.max(0, Number(item?.duration) || 0),
    width: Math.max(0, Number(item?.width) || 0),
    height: Math.max(0, Number(item?.height) || 0),
    name: String(item?.name || item?.label || ''),
    tags: Array.isArray(item?.tags) ? item.tags.map(text) : [],
  }));
}

function mediaAffinity(media, phase, brief, usedIds) {
  const tags = `${media.name} ${media.tags.join(' ')}`;
  let score = media.score * 0.55;

  if (phase === 'hook') score += media.type.startsWith('video') ? 10 : 4;
  if (phase === 'build') score += hasAny(tags, ['detail', 'environment', 'road', 'landscape', 'context']) ? 12 : 0;
  if (phase === 'reveal') score += hasAny(tags, ['reveal', 'hero', 'showcase', 'portrait', 'product']) ? 15 : 0;
  if (phase === 'action') score += hasAny(tags, ['action', 'movement', 'riding', 'driving', 'running', 'race', 'chase']) ? 18 : 0;
  if (phase === 'hero') score += hasAny(tags, ['hero', 'reveal', 'showcase', 'beautiful', 'epic', 'sunset']) ? 18 : 0;

  const mood = text(brief?.mood);
  if (hasAny(mood, ['dark', 'mysterious']) && hasAny(tags, ['night', 'dark', 'shadow', 'moody'])) score += 8;
  if (hasAny(mood, ['emotional', 'calm']) && hasAny(tags, ['sunset', 'portrait', 'calm', 'peaceful'])) score += 8;
  if (hasAny(mood, ['energetic', 'epic']) && hasAny(tags, ['action', 'motion', 'speed'])) score += 8;

  if (usedIds.has(media.id)) score -= 20;
  return score;
}

function chooseMedia(phase, media, brief, usedIds, count = 1) {
  return [...media]
    .sort((a, b) => mediaAffinity(b, phase, brief, usedIds) - mediaAffinity(a, phase, brief, usedIds))
    .slice(0, Math.max(1, count));
}

function durationBudget(template, totalSeconds) {
  const raw = template.map(([phase, ratio, purpose]) => ({
    phase,
    ratio,
    purpose,
    durationSeconds: Math.max(0.5, totalSeconds * ratio),
  }));
  const rawTotal = raw.reduce((sum, item) => sum + item.durationSeconds, 0);
  const scale = rawTotal > totalSeconds ? totalSeconds / rawTotal : 1;
  return raw.map((item) => ({
    ...item,
    durationSeconds: Number((item.durationSeconds * scale).toFixed(2)),
  }));
}

function phaseRequirements(phase, brief, primarySubject) {
  const preserveIdentity = Boolean(brief?.continuity?.preserveReferenceIdentity);
  const requirements = {
    hook: ['readable subject', 'strong opening frame', 'immediate creative signal'],
    build: ['visual context', 'shot variation', 'controlled pacing'],
    reveal: ['clear payoff', 'subject readability', 'stronger composition'],
    action: ['movement or escalation when available', 'rhythmic variation', 'avoid repetitive framing'],
    hero: ['clean final composition', 'social-safe framing', 'deliberate ending'],
  }[phase] || ['purposeful visual progression'];

  if (preserveIdentity) requirements.push('preserve reference identity');
  if (primarySubject !== 'unknown') requirements.push(`respect ${primarySubject} subject continuity`);
  return unique(requirements);
}

function shouldGenerate(phase, mediaCount, brief) {
  if (mediaCount === 0) return true;
  if (phase === 'reveal' && hasAny(brief?.request, ['generated', 'create', 'fantasy', 'surreal', 'cinematic world'])) return true;
  return phase === 'action' && mediaCount < 3 && hasAny(brief?.request, ['generated', 'create', 'ai']);
}

/**
 * Turn a compiled creative brief and media profile into a provider-neutral
 * narrative plan. This layer intentionally stops before rendering: it decides
 * why a shot exists, how long it should serve the story and what evidence is
 * needed to select or generate it.
 */
export function planCreativeStory({ brief = {}, media = [], primarySubject = 'unknown' } = {}) {
  const output = ARC_TEMPLATES[brief?.output] ? brief.output : 'CUSTOM';
  const totalSeconds = clamp(Number(brief?.durationSeconds) || 15, 3, 600);
  const mediaItems = normaliseMedia(media, primarySubject);
  const phases = durationBudget(ARC_TEMPLATES[output], totalSeconds);
  const usedIds = new Set();

  const moments = phases.map((phase, index) => {
    const preferredCount = phase.phase === 'action' && mediaItems.length > 5 ? 2 : 1;
    const candidates = chooseMedia(phase.phase, mediaItems, brief, usedIds, preferredCount);
    candidates.forEach((candidate) => usedIds.add(candidate.id));
    const generated = shouldGenerate(phase.phase, mediaItems.length, brief);

    return {
      id: `moment-${index + 1}`,
      order: index,
      phase: phase.phase,
      role: phase.phase,
      purpose: phase.purpose,
      durationSeconds: phase.durationSeconds,
      candidateMediaIds: candidates.map((candidate) => candidate.id),
      selectedMediaIds: candidates.map((candidate) => candidate.id),
      generation: {
        allowed: generated,
        preferred: generated && phase.phase === 'reveal',
        reason: generated
          ? mediaItems.length === 0
            ? 'No source media is available for this story role.'
            : 'The creative request explicitly supports generated material and this role benefits from it.'
          : 'Prefer existing source media for this story role.',
      },
      requirements: phaseRequirements(phase.phase, brief, primarySubject),
      editorialNotes: [
        index === 0 ? 'Do not spend the opening on low-information setup.' : null,
        index === phases.length - 1 ? 'Protect the final image; do not let a transition weaken the ending.' : null,
        phase.phase === 'action' ? 'Escalate only when the available material supports it.' : null,
      ].filter(Boolean),
    };
  });

  const selected = moments.flatMap((moment) => moment.selectedMediaIds);
  const uniqueSelected = unique(selected);
  const diversity = new Set(
    uniqueSelected
      .map((id) => mediaItems.find((item) => item.id === id)?.subjectType)
      .filter(Boolean),
  ).size;

  return {
    schema: 'bikeztagram.creative-story-plan.v1',
    briefSchema: brief?.schema || null,
    output,
    targetDurationSeconds: totalSeconds,
    primarySubject,
    strategy: mediaItems.length
      ? 'source-first narrative with generated media only when it materially improves the requested story'
      : 'generation-first narrative because no source media is available',
    guardrails: [
      'Preserve the user brief as the highest-level creative intent.',
      'Prefer strong source media over decorative generation.',
      'Do not repeat the same source unnecessarily when alternatives exist.',
      'Generated material must be original and must not imitate protected works.',
      'Never invent media availability or claim a generated shot exists before runtime generation succeeds.',
    ],
    summary: {
      phaseCount: moments.length,
      sourceMediaCount: mediaItems.length,
      selectedSourceCount: uniqueSelected.length,
      subjectDiversity: diversity,
      generatedPhaseCount: moments.filter((moment) => moment.generation.preferred).length,
    },
    moments,
  };
}

export function validateCreativeStoryPlan(plan) {
  const errors = [];
  if (!plan || plan.schema !== 'bikeztagram.creative-story-plan.v1') errors.push('invalid schema');
  if (!Number.isFinite(plan?.targetDurationSeconds) || plan.targetDurationSeconds < 3) errors.push('invalid target duration');
  if (!Array.isArray(plan?.moments) || plan.moments.length < 3) errors.push('at least three story moments are required');

  const phases = plan?.moments || [];
  if (phases[0]?.phase !== 'hook') errors.push('story must start with hook');
  if (phases[phases.length - 1]?.phase !== 'hero') errors.push('story must end with hero');

  const total = phases.reduce((sum, moment) => sum + Number(moment.durationSeconds || 0), 0);
  if (total > plan.targetDurationSeconds + 0.15) errors.push('moment duration exceeds target duration');
  if (phases.some((moment) => !moment.id || !moment.purpose || !Array.isArray(moment.requirements))) {
    errors.push('moment contract incomplete');
  }
  if (phases.some((moment) => moment.generation?.preferred && !moment.generation?.allowed)) {
    errors.push('preferred generation must be allowed');
  }

  return { valid: errors.length === 0, errors };
}
