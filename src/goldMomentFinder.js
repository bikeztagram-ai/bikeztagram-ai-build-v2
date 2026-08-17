/* Gold Moment Finder: rank candidate moments for story and repurposing. */
export function scoreGoldMoment(moment = {}, goal = {}) {
  const values = ['visualImpact','emotionalImpact','storyRelevance','novelty','audioImpact','hookStrength'].map(k => Math.min(1, Math.max(0, Number(moment[k] ?? 0.5))));
  const [visual, emotional, story, novelty, audio, hook] = values;
  const score = visual*.22 + emotional*.18 + story*.20 + novelty*.12 + audio*.10 + hook*.18;
  return { id:moment.id ?? null, start:moment.start ?? null, end:moment.end ?? null, score:Number(score.toFixed(4)), signals:{visual,emotional,story,novelty,audio,hook} };
}
export function findGoldMoments(moments=[], goal={}) { return moments.map(m=>scoreGoldMoment(m,goal)).sort((a,b)=>b.score-a.score); }
