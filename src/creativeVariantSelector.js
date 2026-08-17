export function rankCreativeVariants(variants=[]) {
  return [...variants].map((v)=>({ ...v, totalScore:Number(((Number(v.creativeScore||0)*.35)+(Number(v.hookScore||0)*.25)+(Number(v.visualScore||0)*.2)+(Number(v.platformFit||0)*.2)).toFixed(4)) })).sort((a,b)=>b.totalScore-a.totalScore);
}
export function selectTopVariants(variants=[], count=3){ return rankCreativeVariants(variants).slice(0,Math.max(1,count)); }
