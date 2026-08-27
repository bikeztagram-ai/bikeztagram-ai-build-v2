/* Deterministic cinematic treatment engine. Converts editorial intent into renderer-safe cues. */
const text = v => String(v ?? '').toLowerCase();
const hasAny = (value, words) => words.some(word => text(value).includes(word));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function treatmentFor({ role = '', subjectType = 'unknown', prompt = '', index = 0, total = 1 } = {}) {
  const p = text(prompt);
  const r = text(role);
  const subject = text(subjectType);
  const first = index === 0;
  const last = index === total - 1;

  if (first) {
    return { motion: hasAny(p, ['slow', 'moody', 'mystery']) ? 'slow-push-in' : 'push-in', transition: 'hard-cut', composition: 'strong readable subject', intensity: 'hook' };
  }
  if (last) {
    return { motion: 'gentle-push', transition: 'fade', composition: 'clean hero framing', intensity: 'resolution' };
  }
  if (hasAny(r, ['action', 'chase', 'race']) || hasAny(p, ['action', 'speed', 'race', 'chase'])) {
    return { motion: 'speed-ramp', transition: 'impact-cut', composition: subject.includes('vehicle') ? 'low-angle tracking' : 'forward motion emphasis', intensity: 'high' };
  }
  if (hasAny(r, ['reveal', 'hero']) || hasAny(p, ['reveal', 'showcase', 'launch'])) {
    return { motion: 'slow-orbit', transition: 'match-cut', composition: subject.includes('vehicle') ? 'three-quarter hero' : 'subject-first', intensity: 'rising' };
  }
  if (hasAny(r, ['build', 'variation']) || hasAny(p, ['cinematic', 'trailer'])) {
    return { motion: index % 2 ? 'lateral-pan' : 'slow-push', transition: 'rhythmic-cut', composition: index % 2 ? 'environmental context' : 'medium detail', intensity: 'build' };
  }
  return { motion: 'subtle-drift', transition: 'clean-cut', composition: 'natural framing', intensity: 'controlled' };
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
    return {
      ...moment,
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
