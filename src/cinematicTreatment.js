/* Deterministic cinematic treatment engine. Converts editorial intent into renderer-safe cues. */
const text = v => String(v ?? '').toLowerCase();
const hasAny = (value, words) => words.some(word => text(value).includes(word));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function resolveEditorialRole(moment = {}, index = 0, total = 1) {
  const explicit = [moment.editorialRole, moment.role, moment.purpose, moment.intent]
    .map(text)
    .find(Boolean);
  if (explicit) return explicit;
  if (total === 1) return 'hero-ending';
  return index === 0 ? 'hook' : index === total - 1 ? 'hero-ending' : 'variation';
}

function treatmentFor({ role = '', subjectType = 'unknown', prompt = '', index = 0, total = 1 } = {}) {
  const p = text(prompt);
  const r = text(role);
  const subject = text(subjectType);
  const explicitRole = Boolean(r);
  const first = index === 0;
  const last = index === total - 1;

  // Explicit editorial roles always outrank positional defaults. This keeps
  // a deliberately chosen hero/hook/action/reveal from being reinterpreted
  // just because it happens to be first or last in the array.
  if (hasAny(r, ['hook', 'opening', 'attention'])) {
    return { motion: hasAny(p, ['slow', 'moody', 'mystery']) ? 'slow-push-in' : 'push-in', transition: 'hard-cut', composition: 'strong readable subject', intensity: 'hook' };
  }
  if (hasAny(r, ['hero-ending', 'hero', 'resolution', 'outro'])) {
    return { motion: 'gentle-push', transition: 'fade', composition: 'clean hero framing', intensity: 'resolution' };
  }
  if (hasAny(r, ['action', 'chase', 'race']) || hasAny(p, ['action', 'speed', 'race', 'chase'])) {
    return { motion: 'speed-ramp', transition: 'impact-cut', composition: subject.includes('vehicle') ? 'low-angle tracking' : 'forward motion emphasis', intensity: 'high' };
  }
  if (hasAny(r, ['reveal', 'showcase']) || hasAny(p, ['reveal', 'showcase', 'launch'])) {
    return { motion: 'slow-orbit', transition: 'match-cut', composition: subject.includes('vehicle') ? 'three-quarter hero' : 'subject-first', intensity: 'rising' };
  }
  if (hasAny(r, ['build', 'variation']) || hasAny(p, ['cinematic', 'trailer'])) {
    return { motion: index % 2 ? 'lateral-pan' : 'slow-push', transition: 'rhythmic-cut', composition: index % 2 ? 'environmental context' : 'medium detail', intensity: 'build' };
  }
  if (!explicitRole && first) {
    return { motion: hasAny(p, ['slow', 'moody', 'mystery']) ? 'slow-push-in' : 'push-in', transition: 'hard-cut', composition: 'strong readable subject', intensity: 'hook' };
  }
  if (!explicitRole && last) {
    return { motion: 'gentle-push', transition: 'fade', composition: 'clean hero framing', intensity: 'resolution' };
  }
  return { motion: 'subtle-drift', transition: 'clean-cut', composition: 'natural framing', intensity: 'controlled' };
}

export function buildCinematicTreatments({ moments = [], creativePrompt = '', targetDuration = 15 } = {}) {
  const items = Array.isArray(moments) ? moments : [];
  const budget = Math.max(1, Number(targetDuration) || 15);
  const total = items.length;
  if (!total) return { version: 'cinematic-treatment-v1', targetDuration: budget, totalDuration: 0, items: [] };

  const raw = items.map((moment, index) => {
    const role = resolveEditorialRole(moment, index, total);
    const subjectType = moment.directorSubjectFamily || moment.subjectType || moment.subjectCategory || 'unknown';
    const duration = clamp(Number(moment.duration) || Math.min(2.5, budget / total), 0.5, 6);
    return {
      ...moment,
      editorialRole: role,
      cinematicTreatment: treatmentFor({ role, subjectType, prompt: creativePrompt, index, total }),
      treatmentDuration: duration,
      treatmentIndex: index
    };
  });

  const rawDuration = raw.reduce((sum, item) => sum + item.treatmentDuration, 0);
  const scale = rawDuration > budget ? budget / rawDuration : 1;
  const finalItems = raw.map(item => ({
    ...item,
    treatmentDuration: Number((item.treatmentDuration * scale).toFixed(2))
  }));

  return {
    version: 'cinematic-treatment-v1',
    targetDuration: budget,
    totalDuration: Number(finalItems.reduce((sum, item) => sum + item.treatmentDuration, 0).toFixed(2)),
    items: finalItems
  };
}
