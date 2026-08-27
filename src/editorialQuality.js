/* BIKEZTAGRAM AI — deterministic editorial scoring helpers. */
const text = (value) => String(value ?? '').toLowerCase();
const num = (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };

function semanticText(moment) {
  return text([
    moment?.description, moment?.reason, moment?.action, moment?.event,
    moment?.editorialRole, moment?.purpose, moment?.shotType, moment?.framing,
    moment?.composition, moment?.cameraAngle, moment?.subjectRole, moment?.subject
  ].filter(Boolean).join(' '));
}

function roleMatch(moment, role) {
  const s = semanticText(moment);
  const patterns = {
    hook: /hook|opening|impact|establish|attention|action|reveal/,
    build: /build|journey|approach|tracking|road|movement|detail|medium|wide/,
    reveal: /reveal|unveil|showcase|profile|product|vehicle|motorcycle|bike|portrait/,
    action: /action|movement|speed|race|ride|drive|chase|impact|accelerat/,
    emotional: /emotion|beautiful|sunset|landscape|reaction|smile|laugh|calm|peaceful/,
    variation: /detail|close|wide|medium|angle|texture|environment/,
    hero: /hero|ending|resolution|final|showcase|portrait|landscape|reveal/
  };
  return patterns[role]?.test(s) ? 1 : 0;
}

function lexicalOverlap(a, b) {
  const aw = new Set(semanticText(a).split(/\W+/).filter((word) => word.length > 4));
  const bw = new Set(semanticText(b).split(/\W+/).filter((word) => word.length > 4));
  if (!aw.size || !bw.size) return 0;
  let common = 0;
  for (const word of aw) if (bw.has(word)) common += 1;
  return common / Math.max(1, Math.min(aw.size, bw.size));
}

function sourceId(moment) { return String(moment?.mediaId ?? moment?.mediaIndex ?? 'unknown'); }

function shotFamily(moment) {
  const s = semanticText(moment);
  if (/extreme close|macro|detail|insert/.test(s)) return 'detail';
  if (/close-up|close up|portrait|face|headshot/.test(s)) return 'close';
  if (/wide|establish|landscape|aerial|drone|panorama/.test(s)) return 'wide';
  if (/medium|mid shot|waist|tracking/.test(s)) return 'medium';
  if (/action|chase|race|ride|drive|movement|impact|speed/.test(s)) return 'action';
  if (/overhead|top-down|top down|bird's-eye|birds-eye/.test(s)) return 'overhead';
  return text(moment?.shotType) || 'general';
}

/** Adds a bounded editorial-quality adjustment to a selector candidate. */
export function scoreEditorialCandidate(candidate, { role = 'variation', chosen = [], targetDuration = 15, usedDuration = 0, mode = {} } = {}) {
  if (!candidate) return 0;
  let score = roleMatch(candidate, role) ? 8 : 0;
  const previous = chosen.at(-1);
  if (!previous) return score + (role === 'hook' ? 4 : 0);

  const sameSource = sourceId(candidate) === sourceId(previous);
  const family = shotFamily(candidate);
  const previousFamily = shotFamily(previous);
  const overlap = lexicalOverlap(candidate, previous);
  if (family !== previousFamily) score += 5;
  if (overlap > 0.72) score -= 10;
  else if (overlap < 0.25) score += 2;

  const subjectA = text(candidate?.subjectRole || candidate?.subject || candidate?.identity || candidate?.subjectLabel);
  const subjectB = text(previous?.subjectRole || previous?.subject || previous?.identity || previous?.subjectLabel);
  if (subjectA && subjectB && subjectA === subjectB) score += 3;
  else if (subjectA && subjectB && !sameSource && !mode.action && !mode.funny) score -= 3;

  const candidateStart = num(candidate?.start ?? candidate?.startTime, NaN);
  const previousStart = num(previous?.start ?? previous?.startTime, NaN);
  if (Number.isFinite(candidateStart) && Number.isFinite(previousStart)) {
    const distance = Math.abs(candidateStart - previousStart);
    if (distance < 1) score -= 7;
    else if (distance > Math.max(2, num(targetDuration, 15) / Math.max(4, chosen.length + 1))) score += 2;
  }

  const remaining = Math.max(0, num(targetDuration, 15) - num(usedDuration, 0));
  const duration = Math.max(.5, Math.min(6, num(candidate?.duration, 2)));
  if (remaining > 0) score += Math.max(-4, 3 - Math.abs(duration - Math.min(3, remaining)));
  return score;
}

export function describeEditorialQuality(candidate, context = {}) {
  const score = scoreEditorialCandidate(candidate, context);
  return { score: Number(score.toFixed(2)), shotFamily: shotFamily(candidate), roleFit: roleMatch(candidate, context.role || 'variation') ? 1 : 0 };
}
