const PURPOSES = ['hook', 'build', 'reveal', 'action', 'hero'];
const TRANSITIONS = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
const MOTION = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);

const scoreMoment = (moment = {}) => {
  const score = Number(moment.score);
  const cinematic = Number(moment.cinematicScore ?? moment.compositionScore ?? 0);
  const action = Number(moment.actionScore ?? moment.motionScore ?? 0);
  return (Number.isFinite(score) ? score : 0) * 0.55 + (Number.isFinite(cinematic) ? cinematic : 0) * 0.25 + (Number.isFinite(action) ? action : 0) * 0.20;
};

export function shapeCinematicEditPlan(plan = {}, moments = []) {
  const cuts = Array.isArray(plan.cuts) ? plan.cuts.filter(Boolean).slice(0, 8) : [];
  if (!cuts.length) return plan;

  const ranked = moments.map((moment, index) => ({ index, value: scoreMoment(moment) })).sort((a, b) => b.value - a.value);
  const rankedSet = new Map(ranked.map((item) => [item.index, item.value]));
  const seen = new Set();
  const unique = [];
  const repeated = [];
  for (const cut of cuts) {
    const index = Number(cut.momentIndex);
    if (Number.isInteger(index) && !seen.has(index)) {
      seen.add(index);
      unique.push(cut);
    } else repeated.push(cut);
  }

  const selected = [...unique];
  for (const candidate of ranked) {
    if (selected.length >= Math.min(6, cuts.length)) break;
    if (seen.has(candidate.index)) continue;
    const replacement = cuts.find((cut) => Number(cut.momentIndex) === candidate.index);
    if (replacement) { seen.add(candidate.index); selected.push(replacement); }
  }

  const finalCuts = selected.length >= 3 ? selected : [...selected, ...repeated].slice(0, 6);
  const count = finalCuts.length;
  const purposes = count >= 5 ? PURPOSES : count === 4 ? ['hook', 'build', 'action', 'hero'] : count === 3 ? ['hook', 'reveal', 'hero'] : ['hook', 'hero'];
  const sorted = [...finalCuts].sort((a, b) => (rankedSet.get(Number(b.momentIndex)) ?? 0) - (rankedSet.get(Number(a.momentIndex)) ?? 0));

  const hero = sorted[0];
  const ordered = [...finalCuts];
  const heroIndex = ordered.indexOf(hero);
  if (heroIndex >= 0 && heroIndex !== ordered.length - 1) {
    ordered.splice(heroIndex, 1);
    ordered.push(hero);
  }

  const shaped = ordered.map((cut, index) => {
    const purpose = String(cut.purpose || purposes[Math.min(index, purposes.length - 1)] || 'cinematic');
    const isHero = index === ordered.length - 1;
    const existingMotion = MOTION.has(String(cut.motionStyle)) ? String(cut.motionStyle) : null;
    const existingTransition = TRANSITIONS.has(String(cut.transition)) ? String(cut.transition) : null;
    const motionFallback = ['static', 'slow-push', 'pan-left', 'slow-pull', 'pan-right'][index % 5];
    const transitionFallback = index === 0 ? 'fade-in' : isHero ? 'dip-black' : ['hard-cut', 'crossfade', 'whip-right', 'hard-cut'][index % 4];
    return {
      ...cut,
      purpose: purpose === 'cinematic' ? purposes[Math.min(index, purposes.length - 1)] : purpose,
      motionStyle: existingMotion || motionFallback,
      transition: existingTransition || transitionFallback,
      text: isHero ? String(cut.text || '') : (index === 0 ? String(cut.text || '') : ''),
    };
  });

  return {
    ...plan,
    cuts: shaped,
    editorialStructure: purposes.slice(0, shaped.length),
  };
}
