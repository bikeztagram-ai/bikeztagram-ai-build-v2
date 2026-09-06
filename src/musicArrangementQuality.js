/*
 * Music Arrangement Quality — deterministic editorial QA for original compositions.
 * This evaluates structured arrangements; it does not pretend to be an AI generator.
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

function scoreSections(sections, duration) {
  if (!Array.isArray(sections) || sections.length < 3) return 0;
  let score = 100;
  const ordered = sections.every((s, i) => i === 0 || finite(s.start) >= finite(sections[i - 1].end));
  if (!ordered) score -= 35;
  const validBounds = sections.every((s) => finite(s.end) > finite(s.start) && finite(s.start) >= 0 && finite(s.end) <= duration + 0.05);
  if (!validBounds) score -= 30;
  const energies = sections.map((s) => clamp(s.energy, 0, 1));
  const densities = sections.map((s) => clamp(s.density, 0, 1));
  if (Math.max(...energies) - Math.min(...energies) < 0.22) score -= 18;
  if (Math.max(...densities) - Math.min(...densities) < 0.16) score -= 12;
  if (energies.at(-1) < Math.max(...energies) * 0.72) score -= 8;
  return clamp(score, 0, 100);
}

function scoreStemCoverage(composition) {
  const stems = ['drums', 'bass', 'harmony', 'melody', 'fx'];
  const present = stems.filter((name) => Array.isArray(composition?.[name]) && composition[name].length > 0);
  const melodic = ['bass', 'harmony', 'melody'].filter((name) => Array.isArray(composition?.[name]) && composition[name].length > 0).length;
  return clamp((present.length / stems.length) * 75 + (melodic / 3) * 25, 0, 100);
}

function scoreRhythm(composition) {
  const grid = Array.isArray(composition?.beatGrid) ? composition.beatGrid : [];
  const drums = Array.isArray(composition?.drums) ? composition.drums : [];
  if (!grid.length || !drums.length) return 0;
  const duration = finite(composition?.brief?.duration, finite(grid.at(-1)));
  const coverage = duration > 0 ? Math.min(1, grid.at(-1) / duration) : 0;
  const uniqueTimes = new Set(drums.map((event) => Number(event.time).toFixed(3))).size;
  const variation = drums.length ? Math.min(1, uniqueTimes / Math.max(12, drums.length * 0.48)) : 0;
  return clamp(coverage * 55 + variation * 45, 0, 100);
}

function scoreMelody(composition) {
  const melody = Array.isArray(composition?.melody) ? composition.melody : [];
  if (!melody.length) return 0;
  const pitches = melody.map((event) => finite(event.midi)).filter((m) => m > 0);
  const uniquePitches = new Set(pitches).size;
  const span = pitches.length ? Math.max(...pitches) - Math.min(...pitches) : 0;
  return clamp(Math.min(1, uniquePitches / 7) * 55 + Math.min(1, span / 18) * 45, 0, 100);
}

export function evaluateMusicArrangement(composition = {}) {
  const duration = clamp(composition?.brief?.duration, 0, 3600);
  const section = scoreSections(composition.sections, duration);
  const stems = scoreStemCoverage(composition);
  const rhythm = scoreRhythm(composition);
  const melody = scoreMelody(composition);
  const weights = { structure: 0.32, stems: 0.20, rhythm: 0.24, melody: 0.24 };
  const score = Math.round(section * weights.structure + stems * weights.stems + rhythm * weights.rhythm + melody * weights.melody);
  const issues = [];
  if (section < 70) issues.push('weak-section-arc');
  if (stems < 80) issues.push('missing-stem-layer');
  if (rhythm < 70) issues.push('weak-rhythmic-coverage');
  if (melody < 60) issues.push('weak-melodic-variation');
  const verdict = score >= 88 ? 'PASS' : score >= 72 ? 'REVIEW' : 'REJECT';
  return { version: 1, score, verdict, dimensions: { structure: Math.round(section), stems: Math.round(stems), rhythm: Math.round(rhythm), melody: Math.round(melody) }, issues };
}

export function suggestMusicArrangementRepairs(composition = {}, evaluation = evaluateMusicArrangement(composition)) {
  const actions = [];
  if (evaluation.issues.includes('weak-section-arc')) actions.push({ type: 'strengthen-energy-arc', target: 'sections', reason: 'Increase contrast between intro/build/climax and preserve a decisive ending.' });
  if (evaluation.issues.includes('missing-stem-layer')) actions.push({ type: 'restore-stem-coverage', target: 'stems', reason: 'Ensure drums, bass, harmony, melody and FX each have purposeful material where appropriate.' });
  if (evaluation.issues.includes('weak-rhythmic-coverage')) actions.push({ type: 'tighten-beat-coverage', target: 'beat-grid', reason: 'Keep rhythmic events aligned to the composition beat grid while retaining controlled variation.' });
  if (evaluation.issues.includes('weak-melodic-variation')) actions.push({ type: 'increase-melodic-variation', target: 'melody', reason: 'Introduce bounded pitch/rhythm variation without abandoning the composition key or motif.' });
  return actions;
}
