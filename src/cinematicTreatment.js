/* Deterministic cinematic treatment engine. Converts editorial intent into renderer-safe cues. */
const text = v => String(v ?? '').toLowerCase();
const hasAny = (value, words) => words.some(word => text(value).includes(word));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function treatmentFor({ role = '', subjectType = 'unknown', prompt = '', index = 0, total = 1, previous = null } = {}) {
  const p = text(prompt);
  const r = text(role);
  const subject = text(subjectType);
  const previousSubject = text(previous?.subjectType || previous?.directorSubjectFamily || '');
  const sameSubject = Boolean(previousSubject && subject !== 'unknown' && subject === previousSubject);
  const first = index === 0;
  const last = index === total - 1;

  if (first) {
    return { motion: hasAny(p, ['slow', 'moody', 'mystery']) ? 'slow-push-in' : 'push-in', transition: 'hard-cut', composition: 'strong readable subject', intensity: 'hook', continuity: 'establish' };
  }
  if (last) {
    return { motion: 'gentle-push', transition: sameSubject ? 'soft-fade' : 'fade', composition: 'clean hero framing', intensity: 'resolution', continuity: sameSubject ? 'hold-subject' : 'resolve' };
  }
  if (hasAny(r, ['action', 'chase', 'race']) || hasAny(p, ['action', 'speed', 'race', 'chase'])) {
    return { motion: 'speed-ramp', transition: sameSubject ? 'impact-cut' : 'action-cut', composition: subject.includes('vehicle') ? 'low-angle tracking' : 'forward motion emphasis', intensity: 'high', continuity: sameSubject ? 'continue-action' : 'reframe-action' };
  }
  if (hasAny(r, ['reveal', 'hero']) || hasAny(p, ['reveal', 'showcase', 'launch'])) {
    return { motion: 'slow-orbit', transition: sameSubject ? 'match-cut' : 'reveal-cut', composition: subject.includes('vehicle') ? 'three-quarter hero' : 'subject-first', intensity: 'rising', continuity: sameSubject ? 'match-subject' : 'reveal-subject' };
  }
  if (hasAny(r, ['build', 'variation']) || hasAny(p, ['cinematic', 'trailer'])) {
    return { motion: index % 2 ? 'lateral-pan' : 'slow-push', transition: sameSubject ? 'rhythmic-cut' : 'bridge-cut', composition: index % 2 ? 'environmental context' : 'medium detail', intensity: 'build', continuity: sameSubject ? 'develop' : 'bridge-context' };
  }
  return { motion: 'subtle-drift', transition: sameSubject ? 'clean-cut' : 'context-cut', composition: 'natural framing', intensity: 'controlled', continuity: sameSubject ? 'maintain' : 'reorient' };
}

function allocateTreatmentDurations(rawDurations, budget) {
  const values = rawDurations.map(value => clamp(Number(value) || 0.5, 0.5, 6));
  if (!values.length) return [];
  const target = Math.max(0.5 * values.length, Number(budget) || 15);
  let output = values.map(value => value);
  let remaining = target - output.reduce((sum, value) => sum + value, 0);

  for (let pass = 0; pass < values.length * 3 && Math.abs(remaining) > 0.01; pass += 1) {
    const grow = remaining > 0;
    const eligible = output.filter(value => grow ? value < 6 - 0.001 : value > 0.5 + 0.001).length;
    if (!eligible) break;
    const delta = remaining / eligible;
    output = output.map(value => {
      const next = grow ? Math.min(6, value + delta) : Math.max(0.5, value + delta);
      return Number(next.toFixed(4));
    });
    remaining = target - output.reduce((sum, value) => sum + value, 0);
  }

  return output.map(value => Number(value.toFixed(2)));
}

export function buildCinematicTreatments({ moments = [], creativePrompt = '', targetDuration = 15 } = {}) {
  const items = Array.isArray(moments) ? moments : [];
  const budget = Math.max(1, Number(targetDuration) || 15);
  const total = items.length;
  if (!total) return { version: 'cinematic-treatment-v1', targetDuration: budget, totalDuration: 0, items: [] };

  const raw = items.map((moment, index) => {
    const role = moment.editorialRole || (index === 0 ? 'hook' : index === total - 1 ? 'hero' : 'variation');
    const subjectType = moment.directorSubjectFamily || moment.subjectType || moment.subjectCategory || 'unknown';
    const duration = clamp(Number(moment.duration) || Math.min(2.5, budget / total), 0.5, 6);
    const previous = index > 0 ? items[index - 1] : null;
    return {
      ...moment,
      cinematicTreatment: treatmentFor({ role, subjectType, prompt: creativePrompt, index, total, previous }),
      treatmentDuration: duration,
      treatmentIndex: index
    };
  });

  const durations = allocateTreatmentDurations(raw.map(item => item.treatmentDuration), budget);
  const finalItems = raw.map((item, index) => ({ ...item, treatmentDuration: durations[index] }));

  return {
    version: 'cinematic-treatment-v1',
    targetDuration: budget,
    totalDuration: Number(finalItems.reduce((sum, item) => sum + item.treatmentDuration, 0).toFixed(2)),
    items: finalItems
  };
}
