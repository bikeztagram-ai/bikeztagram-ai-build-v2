export function rankVariants(variants = []) {
  return variants.map(v => ({ ...v, score: Number(((v.creativeScore ?? 0) * .5 + (v.hookScore ?? 0) * .3 + (v.platformFit ?? 0) * .2).toFixed(4)) }))
    .sort((a,b) => b.score - a.score);
}

export function selectTopVariants(variants = [], limit = 3) { return rankVariants(variants).slice(0, Math.max(1, limit)); }
