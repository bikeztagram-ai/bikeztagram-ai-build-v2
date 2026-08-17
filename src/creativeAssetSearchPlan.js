/* Subject-agnostic media intelligence contract. */
export function scoreAssetForMoment(asset = {}, moment = {}) {
  const signals = asset.signals || {};
  const score = [signals.sharpness, signals.composition, signals.subjectVisibility, signals.audioQuality, signals.motionMatch, signals.emotion].map(Number).filter(Number.isFinite);
  const average = score.length ? score.reduce((a,b)=>a+b,0)/score.length : 0.5;
  const keywordBoost = (moment.keywords || []).some(k => String(asset.description || '').toLowerCase().includes(String(k).toLowerCase())) ? 0.15 : 0;
  return Math.min(1, average + keywordBoost);
}
export function buildBestTakePlan(assets = [], moments = []) {
  return moments.map(moment => ({ ...moment, candidates: assets.map(asset => ({ id: asset.id, score: scoreAssetForMoment(asset,moment) })).sort((a,b)=>b.score-a.score).slice(0,5) }));
}
