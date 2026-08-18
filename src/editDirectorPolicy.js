const PURPOSES = ['hook', 'build', 'reveal', 'action', 'hero'];
const TRANSITIONS = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
const MOTION = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);

const numberOr = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const scoreMoment = (moment = {}) => {
  const score = numberOr(moment.score);
  const cinematic = numberOr(moment.cinematicScore ?? moment.compositionScore);
  const action = numberOr(moment.actionScore ?? moment.motionScore);
  const composition = numberOr(moment.compositionScore ?? moment.cinematicScore);
  return score * 0.50 + cinematic * 0.20 + action * 0.20 + composition * 0.10;
};

const descriptor = (moment = {}) => {
  const values = [
    moment.cameraMovement, moment.cameraBehaviour, moment.framing, moment.shotType,
    moment.composition, moment.subjectRelationship, moment.motion, moment.visualType,
  ].filter(Boolean).map((value) => String(value).toLowerCase().trim());
  return new Set(values);
};

const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / Math.max(a.size, b.size);
};

function candidateFromMoment(index, moment, cut = {}) {
  return {
    cut: { ...cut, momentIndex: index },
    index,
    score: scoreMoment(moment),
    descriptor: descriptor(moment),
  };
}

function selectDistinctMoments(cuts, moments, limit = 6) {
  const candidates = [];
  const seen = new Set();

  // Preserve Gemini's explicit choices first, but make the verified Stage 1
  // analysis the fallback source when Gemini supplied too few cuts. This is
  // what prevents a valid analysis from collapsing into a one-shot edit.
  for (const cut of cuts) {
    const index = Number(cut?.momentIndex);
    if (!Number.isInteger(index) || !moments[index] || seen.has(index)) continue;
    seen.add(index);
    candidates.push(candidateFromMoment(index, moments[index], cut));
  }

  const explicitCount = candidates.length;
  for (let index = 0; index < moments.length && candidates.length < limit * 2; index += 1) {
    if (seen.has(index) || !moments[index]) continue;
    seen.add(index);
    candidates.push(candidateFromMoment(index, moments[index]));
  }

  candidates.sort((a, b) => b.score - a.score);

  const selected = [];
  while (candidates.length && selected.length < limit) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      const redundancy = selected.length
        ? Math.max(...selected.map((item) => overlap(candidate.descriptor, item.descriptor)))
        : 0;
      const distancePenalty = selected.length
        ? Math.max(...selected.map((item) => Math.max(0, 1 - Math.abs(candidate.index - item.index) / Math.max(moments.length, 1))))
        : 0;
      const newMomentPenalty = candidate.cut && Object.keys(candidate.cut).length === 1 ? 0 : 0;
      const value = candidate.score - redundancy * 0.25 - distancePenalty * 0.05 + newMomentPenalty;
      if (value > bestValue) { bestValue = value; bestIndex = i; }
    }
    selected.push(candidates.splice(bestIndex, 1)[0]);
  }

  // If Gemini explicitly supplied cuts, retain them when possible. The
  // analysis-derived additions only fill genuine gaps; they never invent
  // timestamps or footage.
  return selected.map((item) => ({ ...item, explicit: Object.keys(item.cut).length > 1 })).slice(0, limit);
}

function purposeSequence(count) {
  if (count >= 5) return PURPOSES.slice(0, 5);
  if (count === 4) return ['hook', 'build', 'action', 'hero'];
  if (count === 3) return ['hook', 'reveal', 'hero'];
  if (count === 2) return ['hook', 'hero'];
  return ['hero'];
}

function chooseTransition(index, isHero, motionStyle, previousMotion) {
  if (index === 0) return 'fade-in';
  if (isHero) return 'dip-black';
  if ((motionStyle === 'pan-left' || motionStyle === 'pan-right') && motionStyle !== previousMotion) {
    return motionStyle === 'pan-left' ? 'whip-left' : 'whip-right';
  }
  return index % 3 === 0 ? 'crossfade' : 'hard-cut';
}

function chooseMotion(moment, index) {
  const camera = `${moment.cameraMovement || ''} ${moment.cameraBehaviour || ''} ${moment.motion || ''}`.toLowerCase();
  if (/left/.test(camera)) return 'pan-left';
  if (/right/.test(camera)) return 'pan-right';
  if (/tilt|upward/.test(camera)) return 'tilt-up';
  if (/downward|down/.test(camera)) return 'tilt-down';
  if (/push|approach|reveal|close/.test(camera)) return 'slow-push';
  if (/pull|retreat|wide/.test(camera)) return 'slow-pull';
  return ['static', 'slow-push', 'pan-left', 'slow-pull', 'pan-right'][index % 5];
}

function chooseSpeed(moment, purpose) {
  const action = numberOr(moment.actionScore ?? moment.motionScore);
  const score = numberOr(moment.score);
  if (purpose === 'action' && action >= 70) return 1.15;
  if (purpose === 'hero' && score >= 80) return 0.9;
  if (purpose === 'build' || purpose === 'reveal') return 0.95;
  return 1;
}

function chooseDuration(cut, moment, speed, purpose) {
  const momentStart = numberOr(moment?.start, 0);
  const momentEnd = numberOr(moment?.end, momentStart);
  const available = Math.max(0, momentEnd - momentStart);
  const explicit = numberOr(cut?.duration, 0);
  if (explicit >= 0.5) return Math.min(4, explicit);
  if (available >= 3.5) return purpose === 'hero' ? 3.5 : 3;
  if (available >= 2.5) return 2.5;
  if (available >= 1.5) return Math.min(2, available / Math.max(speed, 0.5));
  return Math.min(1.5, available / Math.max(speed, 0.5));
}

export function shapeCinematicEditPlan(plan = {}, moments = []) {
  const cuts = Array.isArray(plan.cuts) ? plan.cuts.filter(Boolean).slice(0, 8) : [];
  if (!Array.isArray(moments) || !moments.length) return plan;

  const selected = selectDistinctMoments(cuts, moments, Math.min(6, Math.max(cuts.length, Math.min(6, moments.length))));
  if (!selected.length) return { ...plan, cuts: [] };

  const ordered = selected.map((item) => item.cut);
  const heroPosition = ordered.length - 1;
  const strongest = [...selected].sort((a, b) => b.score - a.score)[0];
  const strongestPosition = ordered.findIndex((cut) => Number(cut.momentIndex) === strongest.index);
  if (strongestPosition >= 0 && strongestPosition !== heroPosition) {
    const [hero] = ordered.splice(strongestPosition, 1);
    ordered.push(hero);
  }

  const purposes = purposeSequence(ordered.length);
  const shaped = ordered.map((cut, index) => {
    const moment = moments[Number(cut.momentIndex)] || {};
    const isHero = index === ordered.length - 1;
    const motionStyle = MOTION.has(String(cut.motionStyle)) ? String(cut.motionStyle) : chooseMotion(moment, index);
    const previousMotion = index > 0 ? shaped[index - 1].motionStyle : '';
    const transition = TRANSITIONS.has(String(cut.transition))
      ? String(cut.transition)
      : chooseTransition(index, isHero, motionStyle, previousMotion);
    const purpose = purposes[Math.min(index, purposes.length - 1)];
    const speed = Math.max(0.5, Math.min(1.5, numberOr(cut.speed, chooseSpeed(moment, purpose))));
    const duration = chooseDuration(cut, moment, speed, purpose);
    const start = numberOr(cut.startTime, numberOr(moment.start, 0));
    const momentEnd = numberOr(moment.end, start + duration * speed);
    const end = Math.min(momentEnd, start + duration * speed);
    const finalDuration = Math.max(0.5, (end - start) / speed);
    return {
      ...cut,
      momentIndex: Number(cut.momentIndex),
      startTime: start,
      endTime: end,
      purpose,
      motionStyle,
      transition,
      speed,
      duration: Number(finalDuration.toFixed(3)),
      text: isHero || index === 0 ? String(cut.text || '') : '',
    };
  });

  const plannedDuration = shaped.reduce((sum, cut) => sum + numberOr(cut.duration), 0);
  return {
    ...plan,
    cuts: shaped,
    editorialStructure: purposes.slice(0, shaped.length),
    plannedDuration: Number(plannedDuration.toFixed(3)),
    selectionPolicy: {
      sourceOfTruth: 'verified-video-analysis',
      maxCuts: 6,
      fillFromVerifiedMomentsWhenGeminiUnderspecifies: true,
      deduplicateMoments: true,
      preferVisualVariety: true,
      strongestMomentAsHero: true,
      preserveVerifiedTimestampsOnly: true,
    },
  };
}