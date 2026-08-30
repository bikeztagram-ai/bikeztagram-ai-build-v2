/* Deterministic cinematic treatment engine. Converts editorial intent into renderer-safe cues. */
const text = v => String(v ?? '').toLowerCase();
const hasAny = (value, words) => words.some(word => text(value).includes(word));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeRole = value => {
  const role = text(value).trim();
  if (role === 'opening' || role === 'intro') return 'hook';
  if (role === 'ending' || role === 'outro' || role === 'hero') return 'hero-ending';
  if (role === 'setup') return 'build';
  return role;
};

function treatmentFor({ role = '', subjectType = 'unknown', prompt = '', index = 0, total = 1 } = {}) {
  const p = text(prompt);
  const r = normalizeRole(role);
  const subject = text(subjectType);
  const first = index === 0;
  const last = index === total - 1;

  // Explicit editorial direction always wins over positional defaults. This is
  // important when the Director deliberately opens with a reveal or places a
  // resolution beat before an optional outro slot.
  if (r === 'action' || r === 'chase' || r === 'race') {
    return { motion: 'speed-ramp', transition: 'impact-cut', composition: subject.includes('vehicle') ? 'low-angle tracking' : 'forward motion emphasis', intensity: 'high' };
  }
  if (r === 'reveal' || r === 'showcase') {
    return { motion: 'slow-orbit', transition: 'match-cut', composition: subject.includes('vehicle') ? 'three-quarter hero' : 'subject-first', intensity: 'rising' };
  }
  if (r === 'hero-ending') {
    return { motion: 'gentle-push', transition: 'fade', composition: 'clean hero framing', intensity: 'resolution' };
  }
  if (r === 'hook') {
    return { motion: hasAny(p, ['slow', 'moody', 'mystery']) ? 'slow-push-in' : 'push-in', transition: first ? 'fade-in' : 'hard-cut', composition: 'strong readable subject', intensity: 'hook' };
  }
  if (r === 'build' || r === 'variation') {
    return { motion: index % 2 ? 'lateral-pan' : 'slow-push', transition: 'rhythmic-cut', composition: index % 2 ? 'environmental context' : 'medium detail', intensity: 'build' };
  }

  if (first) return { motion: hasAny(p, ['slow', 'moody', 'mystery']) ? 'slow-push-in' : 'push-in', transition: 'hard-cut', composition: 'strong readable subject', intensity: 'hook' };
  if (last) return { motion: 'gentle-push', transition: 'fade', composition: 'clean hero framing', intensity: 'resolution' };
  if (hasAny(p, ['action', 'speed', 'race', 'chase'])) return { motion: 'speed-ramp', transition: 'impact-cut', composition: subject.includes('vehicle') ? 'low-angle tracking' : 'forward motion emphasis', intensity: 'high' };
  if (hasAny(p, ['reveal', 'showcase', 'launch'])) return { motion: 'slow-orbit', transition: 'match-cut', composition: subject.includes('vehicle') ? 'three-quarter hero' : 'subject-first', intensity: 'rising' };
  if (hasAny(p, ['cinematic', 'trailer'])) return { motion: index % 2 ? 'lateral-pan' : 'slow-push', transition: 'rhythmic-cut', composition: index % 2 ? 'environmental context' : 'medium detail', intensity: 'build' };
  return { motion: 'subtle-drift', transition: 'clean-cut', composition: 'natural framing', intensity: 'controlled' };
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
    output = output.map(value => Number((grow ? Math.min(6, value + delta) : Math.max(0.5, value + delta)).toFixed(4)));
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
    const role = normalizeRole(moment.editorialRole || moment.role || (index === 0 ? 'hook' : index === total - 1 ? 'hero-ending' : 'variation'));
    const subjectType = moment.directorSubjectFamily || moment.subjectType || moment.subjectCategory || 'unknown';
    const duration = clamp(Number(moment.duration) || Math.min(2.5, budget / total), 0.5, 6);
    return { ...moment, editorialRole: role, cinematicTreatment: treatmentFor({ role, subjectType, prompt: creativePrompt, index, total }), treatmentDuration: duration, treatmentIndex: index };
  });
  const durations = allocateTreatmentDurations(raw.map(item => item.treatmentDuration), budget);
  const finalItems = raw.map((item, index) => ({ ...item, treatmentDuration: durations[index] }));
  return { version: 'cinematic-treatment-v1', targetDuration: budget, totalDuration: Number(finalItems.reduce((sum, item) => sum + item.treatmentDuration, 0).toFixed(2)), items: finalItems };
}
